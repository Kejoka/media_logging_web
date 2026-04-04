import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

type MediaUpdate = {
	image?: string | null;
	release?: string | null;
	averagerating?: number | null;
};

type IgdbTokenRecord = {
	id: number;
	token: string;
	created: string;
	expires_in: number;
};

type TmdbMovieDetails = {
	poster_path?: string | null;
	release_date?: string | null;
	vote_average?: number | null;
};

type TmdbShowDetails = {
	poster_path?: string | null;
	first_air_date?: string | null;
	vote_average?: number | null;
};

type IgdbGameDetails = {
	id?: number;
	cover?: {
		image_id?: string;
	};
	first_release_date?: number | null;
	total_rating?: number | null;
};

function toIsoDate(value: string | null | undefined) {
	if (!value) {
		return null;
	}

	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function toGameRelease(value: number | null | undefined) {
	if (!value) {
		return null;
	}

	const date = new Date(value * 1000);
	return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

async function fetchTmdbJson<T>(url: string) {
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`TMDB request failed with status ${response.status}`);
	}

	return (await response.json()) as T;
}

async function fetchIgdbJson(token: string, query: string) {
	const clientId = Deno.env.get('PRIVATE_IGDB_CLIENT');
	if (!clientId) {
		throw new Error('Missing PRIVATE_IGDB_CLIENT');
	}

	const response = await fetch('https://api.igdb.com/v4/games', {
		method: 'POST',
		headers: {
			'Client-ID': clientId,
			Authorization: `Bearer ${token}`,
			Accept: 'application/json'
		},
		body: query
	});

	if (!response.ok) {
		throw new Error(`IGDB request failed with status ${response.status}`);
	}

	return (await response.json()) as IgdbGameDetails[];
}

async function getIgdbToken() {
	const clientId = Deno.env.get('PRIVATE_IGDB_CLIENT');
	const clientSecret = Deno.env.get('PRIVATE_IGDB_SECRET');

	if (!clientId) {
		throw new Error('Missing PRIVATE_IGDB_CLIENT');
	}

	if (!clientSecret) {
		throw new Error('Missing PRIVATE_IGDB_SECRET');
	}

	const tokenResponse = await fetch(
		`https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`,
		{
			method: 'POST',
			headers: {
				Accept: 'application/json'
			}
		}
	);

	if (!tokenResponse.ok) {
		throw new Error(`IGDB token request failed with status ${tokenResponse.status}`);
	}

	return (await tokenResponse.json()) as { access_token: string; expires_in: number };
}

async function resolveIgdbToken(supabase: SupabaseClient) {
	const { data: igdbStore, error } = await supabase
		.from('igdb_store')
		.select('id, token, created, expires_in')
		.order('created', { ascending: false })
		.limit(1)
		.maybeSingle<IgdbTokenRecord>();

	if (error) {
		throw error;
	}

	const now = new Date();
	if (igdbStore) {
		const expiry = new Date(igdbStore.created);
		expiry.setSeconds(expiry.getSeconds() + igdbStore.expires_in);

		if (expiry > now) {
			return igdbStore.token;
		}
	}

	const tokenResponse = await getIgdbToken();
	const tokenRecord = {
		token: tokenResponse.access_token,
		created: now.toISOString(),
		expires_in: tokenResponse.expires_in
	};

	if (igdbStore) {
		const { error: updateError } = await supabase.from('igdb_store').update(tokenRecord).eq('id', igdbStore.id);
		if (updateError) {
			throw updateError;
		}
	} else {
		const { error: insertError } = await supabase.from('igdb_store').insert(tokenRecord);
		if (insertError) {
			throw insertError;
		}
	}

	return tokenResponse.access_token;
}

async function refreshAllRows(
	supabase: SupabaseClient,
	table: 'movies' | 'shows' | 'games',
	externalIdColumn: 'tmdbid' | 'igdbid',
	mediaIds: Array<number | null | undefined>,
	loadUpdate: (externalId: number) => Promise<MediaUpdate | null>
) {
	const uniqueIds = [...new Set(mediaIds.filter((id): id is number => typeof id === 'number' && !Number.isNaN(id)))];
	const summary = {
		table,
		uniqueIds: uniqueIds.length,
		updatedGroups: 0,
		updatedRows: 0,
		skippedGroups: 0,
		failedGroups: 0,
		failedIds: [] as number[]
	};

	for (const externalId of uniqueIds) {
		let update: MediaUpdate | null;
		try {
			update = await loadUpdate(externalId);
		} catch (error) {
			console.error(`Failed to load ${table} metadata for ${externalId}`, error);
			summary.failedGroups += 1;
			summary.failedIds.push(externalId);
			continue;
		}

		if (!update) {
			summary.skippedGroups += 1;
			continue;
		}

		const { data, error } = await supabase
			.from(table)
			.update(update)
			.eq(externalIdColumn, externalId)
			.select('id');

		if (error) {
			console.error(`Failed to update ${table} rows for ${externalId}`, error);
			summary.failedGroups += 1;
			summary.failedIds.push(externalId);
			continue;
		}

		summary.updatedGroups += 1;
		summary.updatedRows += data?.length ?? 0;
	}

	return summary;
}

export async function cleanupOldNotifications(supabase: SupabaseClient) {
	const cutoff = new Date();
	cutoff.setDate(cutoff.getDate() - 30);
	const cutoffIso = cutoff.toISOString();

	const { error: dismissalError, count: dismissalCount } = await supabase
		.from('dismissed_activities')
		.delete({ count: 'exact' })
		.lt('dismissed_at', cutoffIso);

	if (dismissalError) {
		throw dismissalError;
	}

	const { error: activityError, count: activityCount } = await supabase
		.from('user_activities')
		.delete({ count: 'exact' })
		.lt('created_at', cutoffIso);

	if (activityError) {
		throw activityError;
	}

	return {
		cutoff: cutoffIso,
		deletedUserActivities: activityCount ?? 0,
		deletedDismissedActivities: dismissalCount ?? 0
	};
}

export async function refreshMovieMetadata(supabase: SupabaseClient) {
	const tmdbKey = Deno.env.get('PRIVATE_TMDB_V3_KEY');
	if (!tmdbKey) {
		throw new Error('Missing PRIVATE_TMDB_V3_KEY');
	}

	const { data, error } = await supabase.from('movies').select('tmdbid');
	if (error) {
		throw error;
	}

	return refreshAllRows(supabase, 'movies', 'tmdbid', data?.map((row) => row.tmdbid) ?? [], async (tmdbId) => {
		const details = await fetchTmdbJson<TmdbMovieDetails>(
			`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${tmdbKey}&language=de-DE`
		);

		return {
			image: details.poster_path ? `https://image.tmdb.org/t/p/w154/${details.poster_path}` : null,
			release: toIsoDate(details.release_date),
			averagerating: details.vote_average ?? null
		};
	});
}

export async function refreshShowMetadata(supabase: SupabaseClient) {
	const tmdbKey = Deno.env.get('PRIVATE_TMDB_V3_KEY');
	if (!tmdbKey) {
		throw new Error('Missing PRIVATE_TMDB_V3_KEY');
	}

	const { data, error } = await supabase.from('shows').select('tmdbid');
	if (error) {
		throw error;
	}

	return refreshAllRows(supabase, 'shows', 'tmdbid', data?.map((row) => row.tmdbid) ?? [], async (tmdbId) => {
		const details = await fetchTmdbJson<TmdbShowDetails>(
			`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${tmdbKey}&language=de-DE`
		);

		return {
			image: details.poster_path ? `https://image.tmdb.org/t/p/w154/${details.poster_path}` : null,
			release: toIsoDate(details.first_air_date),
			averagerating: details.vote_average ?? null
		};
	});
}

export async function refreshGameMetadata(supabase: SupabaseClient) {
	const { data, error } = await supabase.from('games').select('igdbid');
	if (error) {
		throw error;
	}

	const token = await resolveIgdbToken(supabase);
	return refreshAllRows(supabase, 'games', 'igdbid', data?.map((row) => row.igdbid) ?? [], async (igdbId) => {
		const details = await fetchIgdbJson(
			token,
			`fields cover.image_id, first_release_date, total_rating; where id = ${igdbId}; limit 1;`
		);
		const game = details[0];
		if (!game) {
			return null;
		}

		return {
			image: game.cover?.image_id ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${game.cover.image_id}.jpg` : null,
			release: toGameRelease(game.first_release_date),
			averagerating: game.total_rating ?? null
		};
	});
}
