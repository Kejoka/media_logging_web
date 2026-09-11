import { isMediaType, type MediaType } from '$lib/utils';

type MediumPayload = {
	id?: number;
	title?: string;
	added?: string;
	release?: string;
	igdbid?: number;
	tmdbid?: number;
	gbid?: string;
	mbid?: string;
};

type SocialUserState = {
	user_id: string;
	username: string;
	media_id?: number;
	media_year?: number;
	mode?: number;
	hasPendingRecommendation?: boolean;
};

function getLookupField(mediaType: MediaType): 'igdbid' | 'tmdbid' | 'gbid' | 'mbid' {
	switch (mediaType) {
		case 'games':
			return 'igdbid';
		case 'movies':
		case 'shows':
			return 'tmdbid';
		case 'books':
			return 'gbid';
		case 'music':
			return 'mbid';
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

function toYear(value?: string): number | undefined {
	if (!value) {
		return undefined;
	}
	const year = new Date(value).getFullYear();
	return Number.isFinite(year) ? year : undefined;
}

/** @type {import('./$types').RequestHandler} */
export async function POST({ request, locals: { supabase, safeGetSession } }) {
	const { session } = await safeGetSession();
	if (!session) {
		return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
	}

	const body = (await request.json()) as {
		mediaType?: string;
		medium?: MediumPayload;
	};

	if (!body.mediaType || !isMediaType(body.mediaType)) {
		return new Response(JSON.stringify({ error: 'Invalid mediaType' }), { status: 400 });
	}
	if (!body.medium) {
		return new Response(JSON.stringify({ error: 'Missing medium payload' }), { status: 400 });
	}

	const mediaType = body.mediaType;
	const table = mediaType;
	const medium = body.medium;
	const lookupField = getLookupField(mediaType);
	const lookupValue = getLookupValue(medium, mediaType);

	try {
		const { data: followingRows, error: followingError } = await supabase
			.from('following')
			.select('followee')
			.eq('follower', session.user.id);

		if (followingError) throw followingError;

		const followeeIds = (followingRows || []).map((row) => row.followee as string);
		if (followeeIds.length === 0) {
			return new Response(JSON.stringify({ consumed: [], backlog: [], eligible: [] }));
		}

		const [{ data: profiles, error: profilesError }, { data: sentRecommendations, error: recError }] =
			await Promise.all([
				supabase.from('profiles').select('id, username').in('id', followeeIds),
				supabase
					.from('user_activities')
					.select('details')
					.eq('user_id', session.user.id)
					.eq('activity_type', 'recommendation')
					.eq('media_type', mediaType)
			]);

		if (profilesError) throw profilesError;
		if (recError) throw recError;

		const pendingRecipientIds = new Set<string>();
		for (const recommendation of sentRecommendations || []) {
			const details = recommendation.details as Record<string, unknown>;
			if (!details || details.status !== 'pending') {
				continue;
			}
			const recommendationLookupValue = details.media_lookup_value;
			if (lookupValue && String(recommendationLookupValue) !== lookupValue) {
				continue;
			}
			if (!lookupValue) {
				const recommendedTitle = String(details.media_title || '').trim().toLowerCase();
				const currentTitle = String(medium.title || '').trim().toLowerCase();
				if (!recommendedTitle || recommendedTitle !== currentTitle) {
					continue;
				}
			}
			if (typeof details.recipient_id === 'string') {
				pendingRecipientIds.add(details.recipient_id);
			}
		}

		let query = supabase
			.from(table)
			.select('id, user_id, backlogged, added, release')
			.in('user_id', followeeIds);

		if (lookupValue) {
			query = query.eq(lookupField, lookupValue);
		} else if (medium.title) {
			query = query.eq('title', medium.title);
		} else {
			return new Response(JSON.stringify({ consumed: [], backlog: [], eligible: [] }));
		}

		const { data: mediaRows, error: mediaError } = await query;
		if (mediaError) throw mediaError;

		const mediaByUser = new Map<string, { id: number; backlogged: number; added?: string; release?: string }>();
		for (const row of mediaRows || []) {
			const userId = String(row.user_id);
			const isConsumed = Number(row.backlogged || 0) !== 1;
			const current = mediaByUser.get(userId);
			if (!current || (isConsumed && Number(current.backlogged || 0) === 1)) {
				mediaByUser.set(userId, {
					id: Number(row.id),
					backlogged: Number(row.backlogged || 0),
					added: row.added || undefined,
					release: row.release || undefined
				});
			}
		}

		const profileMap = new Map(
			(profiles || []).map((profile) => [String(profile.id), String(profile.username)])
		);

		const consumed: SocialUserState[] = [];
		const backlog: SocialUserState[] = [];
		const eligible: SocialUserState[] = [];

		for (const followeeId of followeeIds) {
			const username = profileMap.get(String(followeeId));
			if (!username) {
				continue;
			}
			const row = mediaByUser.get(String(followeeId));
			if (!row) {
				eligible.push({
					user_id: String(followeeId),
					username,
					hasPendingRecommendation: pendingRecipientIds.has(String(followeeId))
				});
				continue;
			}

			const entry: SocialUserState = {
				user_id: String(followeeId),
				username,
				media_id: row.id,
				media_year: toYear(row.added) ?? toYear(row.release),
				mode: Number(row.backlogged || 0) === 1 ? 1 : 0
			};

			if (Number(row.backlogged || 0) === 1) {
				backlog.push(entry);
			} else {
				consumed.push(entry);
			}
		}

		const byName = (a: SocialUserState, b: SocialUserState) =>
			a.username.localeCompare(b.username, 'de', { sensitivity: 'base' });
		consumed.sort(byName);
		backlog.sort(byName);
		eligible.sort(byName);

		return new Response(
			JSON.stringify({
				consumed,
				backlog,
				eligible
			})
		);
	} catch (error) {
		console.error('Error fetching medium follower state:', error);
		return new Response(JSON.stringify({ error: 'Failed to fetch medium follower state' }), {
			status: 500
		});
	}
}
