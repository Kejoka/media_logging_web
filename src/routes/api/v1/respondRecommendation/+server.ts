import { isMediaType, type MediaType } from '$lib/utils';
import { encodeReviewNotes } from '$lib/reviewNotes';

type MediumPayload = {
	title?: string;
	added?: string;
	release?: string;
	image?: string;
	genres?: string;
	platforms?: string;
	author?: string;
	subtitle?: string;
	pagecount?: number;
	seasons?: string;
	igdbid?: number;
	tmdbid?: number;
	gbid?: number;
	averagerating?: number;
};

function getLookupField(mediaType: MediaType): 'igdbid' | 'tmdbid' | 'gbid' {
	switch (mediaType) {
		case 'games':
			return 'igdbid';
		case 'movies':
		case 'shows':
			return 'tmdbid';
		case 'books':
			return 'gbid';
	}
}

function getLookupValue(medium: MediumPayload, mediaType: MediaType): string | null {
	const lookupField = getLookupField(mediaType);
	const rawValue = medium[lookupField];
	if (rawValue == null) {
		return null;
	}
	return String(rawValue);
}

function toMediaYear(rawDate?: string): number | null {
	if (!rawDate) {
		return null;
	}
	const year = new Date(rawDate).getFullYear();
	return Number.isFinite(year) ? year : null;
}

function buildBacklogInsert(mediaType: MediaType, medium: MediumPayload, userId: string) {
	const common = {
		user_id: userId,
		title: medium.title || 'Kein Titel angegeben',
		image: medium.image || null,
		release: medium.release || null,
		genres: medium.genres || null,
		averagerating: medium.averagerating || null,
		added: new Date().toISOString(),
		rating: 0,
		backlogged: 1,
		notes: null
	};

	switch (mediaType) {
		case 'games':
			return {
				...common,
				igdbid: medium.igdbid || null,
				platforms: medium.platforms || null,
				trophy: 0
			};
		case 'movies':
			return {
				...common,
				tmdbid: medium.tmdbid || null
			};
		case 'shows':
			return {
				...common,
				tmdbid: medium.tmdbid || null,
				seasons: medium.seasons || null,
				episode: 0
			};
		case 'books':
			return {
				...common,
				gbid: medium.gbid || null,
				subtitle: medium.subtitle || null,
				author: medium.author || null,
				pagecount: medium.pagecount || null
			};
	}
}

function buildRecommendationBubble(details: Record<string, unknown>, responseMessage: string) {
	const senderUsername = String(details.sender_username || details.sender_name || 'Unbekannt');
	const senderMessage = String(details.message || '').trim();
	const acceptedResponse = responseMessage.trim();
	const lines = [`Empfehlung von @${senderUsername}`];
	if (senderMessage.length > 0) {
		lines.push(`Nachricht: ${senderMessage}`);
	}
	if (acceptedResponse.length > 0) {
		lines.push(`Antwort: ${acceptedResponse}`);
	}
	return encodeReviewNotes([
		{
			text: lines.join('\n'),
			spoiler: false,
			private: false
		}
	]);
}

/** @type {import('./$types').RequestHandler} */
export async function POST({ request, locals: { supabase, safeGetSession } }) {
	const { session } = await safeGetSession();
	if (!session) {
		return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
	}

	const body = (await request.json()) as {
		recommendationId?: string | number;
		action?: 'accept' | 'decline';
		message?: string;
	};

	const recommendationId = Number(String(body.recommendationId || '').replace(/^activity_/, ''));
	if (!Number.isFinite(recommendationId)) {
		return new Response(JSON.stringify({ error: 'Invalid recommendationId' }), { status: 400 });
	}
	if (body.action !== 'accept' && body.action !== 'decline') {
		return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400 });
	}

	try {
		const { data: recommendation, error: recommendationError } = await supabase
			.from('user_activities')
			.select('id, user_id, activity_type, media_type, media_title, details')
			.eq('id', recommendationId)
			.single();
		if (recommendationError || !recommendation) {
			return new Response(JSON.stringify({ error: 'Recommendation not found' }), { status: 404 });
		}
		if (recommendation.activity_type !== 'recommendation') {
			return new Response(JSON.stringify({ error: 'Invalid recommendation type' }), { status: 400 });
		}
		if (!isMediaType(String(recommendation.media_type || ''))) {
			return new Response(JSON.stringify({ error: 'Invalid recommendation media type' }), {
				status: 400
			});
		}

		const details = (recommendation.details || {}) as Record<string, unknown>;
		if (String(details.recipient_id) !== String(session.user.id)) {
			return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
		}
		if (String(details.status) !== 'pending') {
			return new Response(JSON.stringify({ error: 'Recommendation already answered' }), {
				status: 409
			});
		}

		const mediaType = recommendation.media_type as MediaType;
		const mediumSnapshot = (details.medium_snapshot || {}) as MediumPayload;
		const responseMessage = (body.message || '').trim();
		const responseAt = new Date().toISOString();
		let resolvedMediaId: number | null = null;
		let resolvedMode: number | null = null;
		let resolvedYear: number | null = null;
		let backlogNotes: string | null = null;

		if (body.action === 'accept') {
			const lookupField = getLookupField(mediaType);
			const lookupValue = getLookupValue(mediumSnapshot, mediaType);
			backlogNotes = buildRecommendationBubble(details, responseMessage);
			let existingQuery = supabase
				.from(mediaType)
				.select('id, backlogged, added, release')
				.eq('user_id', session.user.id)
				.limit(1);
			if (lookupValue) {
				existingQuery = existingQuery.eq(lookupField, lookupValue);
			} else {
				existingQuery = existingQuery.eq('title', mediumSnapshot.title || '');
			}
			const { data: existingRows, error: existingError } = await existingQuery;
			if (existingError) throw existingError;

			let targetRow = existingRows?.[0];
			if (!targetRow) {
				const insertPayload = {
					...buildBacklogInsert(mediaType, mediumSnapshot, session.user.id),
					notes: backlogNotes
				};
				const { data: inserted, error: insertError } = await supabase
					.from(mediaType)
					.insert(insertPayload)
					.select('id, backlogged, added, release')
					.single();
				if (insertError) throw insertError;
				targetRow = inserted;
			}

			if (targetRow) {
				resolvedMediaId = Number(targetRow.id);
				resolvedMode = 1;
				resolvedYear = toMediaYear(targetRow.added || targetRow.release);
				if (Number(targetRow.backlogged || 0) !== 1) {
					const { error: backlogUpdateError } = await supabase
						.from(mediaType)
						.update({ backlogged: 1, notes: backlogNotes })
						.eq('id', resolvedMediaId)
						.eq('user_id', session.user.id);
					if (backlogUpdateError) throw backlogUpdateError;
				}
			}
		}

		const updatedDetails = {
			...details,
			status: body.action === 'accept' ? 'accepted' : 'declined',
			response_message: responseMessage,
			responded_at: responseAt
		};

		const { error: profileUpdateError } = await supabase.from('profiles').upsert({
			id: session.user.id,
			updated_at: responseAt
		});
		if (profileUpdateError) throw profileUpdateError;

		const { error: updateError } = await supabase
			.from('user_activities')
			.update({ details: updatedDetails })
			.eq('id', recommendationId);
		if (updateError) throw updateError;

		const { error: feedbackError } = await supabase.from('user_activities').insert({
			user_id: session.user.id,
			activity_type: 'recommendation_response',
			media_type: mediaType,
			media_title: recommendation.media_title,
			details: {
				sender_id: recommendation.user_id,
				sender_username: details.sender_username,
				recipient_id: session.user.id,
				recommendation_id: recommendationId,
				response: body.action,
				response_message: responseMessage,
				media_id: resolvedMediaId,
				mode: resolvedMode,
				media_year: resolvedYear
			}
		});
		if (feedbackError) throw feedbackError;

		if (body.action === 'accept' && resolvedMediaId != null && backlogNotes) {
			const { error: notesError } = await supabase
				.from(mediaType)
				.update({ notes: backlogNotes })
				.eq('id', resolvedMediaId)
				.eq('user_id', session.user.id);
			if (notesError) throw notesError;
		}

		let resolvedMedium: {
			id: number;
			added?: string;
			notes?: string;
			backlogged?: number;
		} | null = null;
		if (body.action === 'accept' && resolvedMediaId != null) {
			const { data: mediumRow, error: mediumRowError } = await supabase
				.from(mediaType)
				.select('id, added, notes, backlogged')
				.eq('id', resolvedMediaId)
				.eq('user_id', session.user.id)
				.single();
			if (mediumRowError) throw mediumRowError;
			resolvedMedium = {
				id: Number(mediumRow.id),
				added: mediumRow.added || undefined,
				notes: mediumRow.notes || undefined,
				backlogged: Number(mediumRow.backlogged || 0)
			};
		}

		return new Response(
			JSON.stringify({
				success: true,
				action: body.action,
				media_id: resolvedMediaId,
				mode: resolvedMode,
				media_type: mediaType,
				resolved_medium: resolvedMedium
			})
		);
	} catch (error) {
		console.error('Error responding to recommendation:', error);
		return new Response(JSON.stringify({ error: 'Failed to respond to recommendation' }), {
			status: 500
		});
	}
}
