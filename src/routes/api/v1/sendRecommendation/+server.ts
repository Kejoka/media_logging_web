import { isMediaType, type MediaType } from '$lib/utils';

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

function getMediaYear(medium: MediumPayload): number | null {
	const rawDate = medium.added || medium.release;
	if (!rawDate) {
		return null;
	}
	const year = new Date(rawDate).getFullYear();
	return Number.isFinite(year) ? year : null;
}

/** @type {import('./$types').RequestHandler} */
export async function POST({ request, locals: { supabase, safeGetSession } }) {
	const { session } = await safeGetSession();
	if (!session) {
		return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
	}

	const body = (await request.json()) as {
		recipientUsername?: string;
		mediaType?: string;
		medium?: MediumPayload;
		message?: string;
	};

	if (!body.recipientUsername || !body.mediaType || !body.medium) {
		return new Response(JSON.stringify({ error: 'Missing payload fields' }), { status: 400 });
	}
	if (!isMediaType(body.mediaType)) {
		return new Response(JSON.stringify({ error: 'Invalid mediaType' }), { status: 400 });
	}

	const mediaType = body.mediaType;
	const medium = body.medium;
	const lookupField = getLookupField(mediaType);
	const lookupValue = getLookupValue(medium, mediaType);
	const message = (body.message || '').trim();

	try {
		const { data: recipientProfile, error: recipientError } = await supabase
			.from('profiles')
			.select('id, username')
			.eq('username', body.recipientUsername)
			.single();
		if (recipientError || !recipientProfile) {
			return new Response(JSON.stringify({ error: 'Empfänger nicht gefunden' }), { status: 404 });
		}

		if (String(recipientProfile.id) === String(session.user.id)) {
			return new Response(JSON.stringify({ error: 'Du kannst dir nicht selbst empfehlen' }), {
				status: 400
			});
		}

		const { data: follows, error: followsError } = await supabase
			.from('following')
			.select('follower')
			.eq('follower', session.user.id)
			.eq('followee', recipientProfile.id)
			.maybeSingle();
		if (followsError) throw followsError;
		if (!follows) {
			return new Response(
				JSON.stringify({ error: 'Empfehlungen sind nur an gefolgte Nutzer möglich' }),
				{ status: 403 }
			);
		}

		let recipientQuery = supabase
			.from(mediaType)
			.select('id')
			.eq('user_id', recipientProfile.id)
			.limit(1);
		if (lookupValue) {
			recipientQuery = recipientQuery.eq(lookupField, lookupValue);
		} else if (medium.title) {
			recipientQuery = recipientQuery.eq('title', medium.title);
		} else {
			return new Response(JSON.stringify({ error: 'Medium konnte nicht identifiziert werden' }), {
				status: 400
			});
		}

		const { data: existingRecipientMedium, error: recipientMediumError } = await recipientQuery;
		if (recipientMediumError) throw recipientMediumError;
		if ((existingRecipientMedium || []).length > 0) {
			return new Response(
				JSON.stringify({
					error: 'Der Nutzer hat dieses Medium bereits konsumiert oder im Backlog.'
				}),
				{ status: 409 }
			);
		}

		const { data: ownRecommendations, error: recommendationError } = await supabase
			.from('user_activities')
			.select('details')
			.eq('user_id', session.user.id)
			.eq('activity_type', 'recommendation')
			.eq('media_type', mediaType);
		if (recommendationError) throw recommendationError;

		for (const recommendation of ownRecommendations || []) {
			const details = recommendation.details as Record<string, unknown>;
			if (!details || details.status !== 'pending') {
				continue;
			}
			if (String(details.recipient_id) !== String(recipientProfile.id)) {
				continue;
			}
			if (lookupValue && String(details.media_lookup_value) !== lookupValue) {
				continue;
			}
			if (!lookupValue) {
				const recommendedTitle = String(details.media_title || '').trim().toLowerCase();
				if (recommendedTitle !== String(medium.title || '').trim().toLowerCase()) {
					continue;
				}
			}
			return new Response(
				JSON.stringify({ error: 'Für diesen Nutzer existiert bereits eine offene Empfehlung.' }),
				{ status: 409 }
			);
		}

		const details = {
			sender_id: session.user.id,
			sender_username: session.user.user_metadata?.username || session.user.email || 'Unbekannt',
			recipient_id: recipientProfile.id,
			recipient_username: recipientProfile.username,
			status: 'pending',
			message,
			media_lookup_key: lookupField,
			media_lookup_value: lookupValue,
			media_title: medium.title,
			media_year: getMediaYear(medium),
			medium_snapshot: medium
		};

		const { error: insertError } = await supabase.from('user_activities').insert({
			user_id: session.user.id,
			activity_type: 'recommendation',
			media_type: mediaType,
			media_title: medium.title || null,
			details
		});

		if (insertError) throw insertError;

		return new Response(JSON.stringify({ success: true }));
	} catch (error) {
		console.error('Error sending recommendation:', error);
		return new Response(JSON.stringify({ error: 'Failed to send recommendation' }), {
			status: 500
		});
	}
}
