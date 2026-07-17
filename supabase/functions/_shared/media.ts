import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

type MediaUpdate = {
	image?: string | null;
	release?: string | null;
	averagerating?: number | null;
	pagecount?: number | null;
	genres?: string | null;
	title?: string | null;
	author?: string | null;
};

// Helper to limit concurrent async operations
async function runWithConcencyLimit<T, U>(
	items: T[],
	concurrency: number,
	fn: (item: T) => Promise<U>
): Promise<U[]> {
	const results: U[] = [];
	const executing: Promise<U>[] = [];

	for (const item of items) {
		const promise = fn(item).then((result) => {
			executing.splice(executing.indexOf(promise), 1);
			return result;
		});

		executing.push(promise);

		if (executing.length >= concurrency) {
			await Promise.race(executing);
		}
	}

	return Promise.all(executing).then((resolved) => {
		results.push(...resolved);
		return results;
	});
}

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

type TmdbSeasonDetails = {
	poster_path?: string | null;
	air_date?: string | null;
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

type MovieRow = {
	tmdbid?: number | null;
};

type ShowRow = {
	id?: number | null;
	tmdbid?: number | null;
	seasons?: string | null;
};

type GameRow = {
	igdbid?: number | null;
};

type BookRow = {
	id?: number | null;
	gbid?: string | null;
	title?: string | null;
	author?: string | null;
};

type OpenLibraryDoc = {
	key?: string;
	title?: string;
	author_name?: string[];
	first_publish_date?: string;
	first_publish_year?: number;
	cover_i?: number;
	number_of_pages_median?: number;
	ratings_average?: number;
	subject?: string[];
};

type OpenLibrarySearchResponse = {
	docs?: OpenLibraryDoc[];
};

const BOOK_GENRE_RULES: Array<[string, string[]]> = [
	['Science Fiction', ['science fiction', 'science fantasy', 'sci fi', 'scifi', 'dystopian']],
	['Fantasy', ['fantasy', 'magic', 'magical', 'litrpg', 'sword and sorcery']],
	['Thriller', ['thriller', 'suspense', 'spy stories', 'espionage']],
	['Krimi', ['detective', 'murder', 'crime', 'criminal', 'mystery fiction']],
	['Mystery', ['mystery', 'detective']],
	['Romantik', ['romance', 'love stories']],
	['Historischer Roman', ['historical fiction', 'history fiction']],
	['Biografie', ['biography', 'biographies']],
	['Autobiografie', ['autobiography', 'autobiographies', 'memoir']],
	['Psychologie', ['psychology', 'psychological']],
	['Selbsthilfe', ['self-help', 'self help']],
	['Wirtschaft', ['business', 'economics', 'finance', 'management']],
	['Wissenschaft', ['popular science', 'technology', 'mathematics', 'physics', 'biology']],
	['Geschichte', ['history', 'historical']],
	['Kinderbuch', ['juvenile fiction', 'children', 'children’s', "children's"]],
	['Jugendbuch', ['young adult', 'juvenile literature', 'teen']],
	['Manga/Comic', ['comic', 'comics', 'manga', 'graphic novel']],
	['Lyrik', ['poetry', 'poems']],
	['Sachbuch', ['nonfiction', 'non-fiction', 'non fiction']],
	['Belletristik', ['fiction', 'literature', 'novel']]
];

class TmdbHttpError extends Error {
	status: number;

	constructor(status: number, message: string) {
		super(message);
		this.status = status;
	}
}

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

function getOpenLibraryHeaders() {
	const contactEmail = Deno.env.get('PRIVATE_OPENLIBRARY_CONTACT_EMAIL');
	const headers: Record<string, string> = {
		Accept: 'application/json',
		'User-Agent': contactEmail ? `media-logging-web/1.0 (${contactEmail})` : 'media-logging-web/1.0'
	};

	if (contactEmail) {
		headers.From = contactEmail;
	}

	return headers;
}

function normalizeOpenLibraryWorkId(key: string | null | undefined) {
	if (!key) {
		return null;
	}

	const match = key.match(/OL\d+W/);
	return match?.[0] ?? null;
}

function toOpenLibraryRelease(doc: OpenLibraryDoc) {
	const publishedDate = doc.first_publish_date?.trim();
	if (publishedDate) {
		const parsed = new Date(publishedDate);
		if (!Number.isNaN(parsed.getTime())) {
			return parsed.toISOString();
		}
	}

	if (typeof doc.first_publish_year === 'number' && Number.isFinite(doc.first_publish_year)) {
		return new Date(Date.UTC(doc.first_publish_year, 0, 1)).toISOString();
	}

	return null;
}

function normalizeSubject(subject: string) {
	return subject
		.toLowerCase()
		.replace(/^(?:subject|genre|series|place|person|time):/i, '')
		.replace(/[_-]+/g, ' ')
		.trim();
}

function mapOpenLibrarySubjectsToGenres(subjects: string[] | undefined) {
	if (!subjects?.length) {
		return null;
	}

	const normalizedSubjects = subjects.map(normalizeSubject).filter(Boolean);
	const genres: string[] = [];

	for (const [genre, needles] of BOOK_GENRE_RULES) {
		if (normalizedSubjects.some((subject) => needles.some((needle) => subject.includes(needle)))) {
			genres.push(genre);
		}
	}

	return genres.length ? genres.slice(0, 4).join(', ') : null;
}

function openLibraryDocToUpdate(doc: OpenLibraryDoc, row?: BookRow): MediaUpdate {
	const update: MediaUpdate = {
		image: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : null,
		release: toOpenLibraryRelease(doc),
		averagerating:
			typeof doc.ratings_average === 'number' ? Number(doc.ratings_average.toFixed(1)) : null,
		pagecount:
			typeof doc.number_of_pages_median === 'number' && Number.isFinite(doc.number_of_pages_median)
				? doc.number_of_pages_median
				: null,
		genres: mapOpenLibrarySubjectsToGenres(doc.subject)
	};

	if (row && !row.title && doc.title) {
		update.title = doc.title;
	}

	if (row && !row.author && doc.author_name?.length) {
		update.author = doc.author_name.join(', ');
	}

	return update;
}

async function fetchOpenLibraryWorkMetadata(workId: string) {
	const url = new URL('https://openlibrary.org/search.json');
	url.searchParams.set('q', `key:/works/${workId}`);
	url.searchParams.set('limit', '1');
	url.searchParams.set(
		'fields',
		[
			'key',
			'title',
			'author_name',
			'first_publish_year',
			'first_publish_date',
			'cover_i',
			'number_of_pages_median',
			'ratings_average',
			'subject'
		].join(',')
	);

	const response = await fetch(url.toString(), {
		headers: getOpenLibraryHeaders()
	});

	if (!response.ok) {
		throw new Error(`OpenLibrary request failed with status ${response.status}`);
	}

	const payload = (await response.json()) as OpenLibrarySearchResponse;
	const normalizedWorkId = normalizeOpenLibraryWorkId(workId);
	return payload.docs?.find((doc) => normalizeOpenLibraryWorkId(doc.key) === normalizedWorkId) ?? null;
}

function parseSingleSeasonNumber(rawSeasons: string | null | undefined): number | null {
	if (!rawSeasons) {
		return null;
	}

	const normalized = rawSeasons.trim();
	if (!normalized || normalized.includes('-')) {
		return null;
	}

	const seasonNumber = Number.parseInt(normalized, 10);
	if (Number.isNaN(seasonNumber) || seasonNumber <= 0) {
		return null;
	}

	return seasonNumber;
}

async function fetchTmdbJson<T>(url: string): Promise<T>;
async function fetchTmdbJson<T>(url: string, options: { allow404: true }): Promise<T | null>;
async function fetchTmdbJson<T>(url: string, options?: { allow404?: boolean }): Promise<T | null> {
	const response = await fetch(url);
	if (response.status === 404 && options?.allow404) {
		return null;
	}

	if (!response.ok) {
		throw new TmdbHttpError(response.status, `TMDB request failed with status ${response.status}`);
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

	// Fetch all metadata concurrently (max 10 at a time)
	const metadataResults = await runWithConcencyLimit(uniqueIds, 10, async (externalId) => {
		try {
			const update = await loadUpdate(externalId);
			return { externalId, update, error: null };
		} catch (error) {
			console.error(`Failed to load ${table} metadata for ${externalId}`, error);
			return { externalId, update: null, error };
		}
	});

	// Update database with fetched metadata, also in parallel
	const updateResults = await runWithConcencyLimit(
		metadataResults.filter((r) => r.update !== null && r.error === null),
		10,
		async (result) => {
			const { data, error } = await supabase
				.from(table)
				.update(result.update!)
				.eq(externalIdColumn, result.externalId)
				.select('id');

			if (error) {
				console.error(`Failed to update ${table} rows for ${result.externalId}`, error);
				return { success: false, externalId: result.externalId, rowCount: 0 };
			}

			return { success: true, externalId: result.externalId, rowCount: data?.length ?? 0 };
		}
	);

	// Aggregate results
	for (const result of metadataResults) {
		if (result.error) {
			summary.failedGroups += 1;
			summary.failedIds.push(result.externalId);
		} else if (!result.update) {
			summary.skippedGroups += 1;
		}
	}

	for (const result of updateResults) {
		if (result.success) {
			summary.updatedGroups += 1;
			summary.updatedRows += result.rowCount;
		}
	}

	return summary;
}

export async function cleanupOldNotifications(supabase: SupabaseClient) {
	const cutoff = new Date();
	cutoff.setDate(cutoff.getDate() - 30);
	const cutoffIso = cutoff.toISOString();
	const auditCutoff = new Date();
	auditCutoff.setDate(auditCutoff.getDate() - 90);
	const auditCutoffIso = auditCutoff.toISOString();

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

	let auditLogResult: { deleted: number; error?: string } = { deleted: 0 };
	try {
		const { error: auditLogError, count: auditLogCount } = await supabase
			.schema('auth')
			.from('audit_log_entries')
			.delete({ count: 'exact' })
			.lt('created_at', auditCutoffIso);

		if (auditLogError) {
			throw auditLogError;
		}

		auditLogResult = { deleted: auditLogCount ?? 0 };
	} catch (error) {
		auditLogResult = {
			deleted: 0,
			error: error instanceof Error ? error.message : String(error)
		};
	}

	return {
		cutoff: cutoffIso,
		auditCutoff: auditCutoffIso,
		deletedUserActivities: activityCount ?? 0,
		deletedDismissedActivities: dismissalCount ?? 0,
		deletedAuditLogEntries: auditLogResult.deleted,
		auditLogCleanupError: auditLogResult.error
	};
}

export async function refreshMovieMetadata(supabase: SupabaseClient) {
	const tmdbKey = Deno.env.get('PRIVATE_TMDB_V3_KEY');
	if (!tmdbKey) {
		throw new Error('Missing PRIVATE_TMDB_V3_KEY');
	}

	let data;
	let error;
	try {
		({ data, error } = await supabase.from('movies').select('tmdbid'));
	} catch (queryError) {
		throw new Error(
			`refreshMovieMetadata select failed: ${queryError instanceof Error ? queryError.message : String(queryError)}`
		);
	}
	if (error) {
		throw new Error(`refreshMovieMetadata select error: ${error.message || String(error)}`);
	}
	const rows = (data ?? []) as MovieRow[];

	return refreshAllRows(
		supabase,
		'movies',
		'tmdbid',
		rows.map((row) => row.tmdbid),
		async (tmdbId) => {
			const details = await fetchTmdbJson<TmdbMovieDetails>(
				`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${tmdbKey}&language=de-DE`
			);

			return {
				image: details.poster_path ? `https://image.tmdb.org/t/p/w154/${details.poster_path}` : null,
				release: toIsoDate(details.release_date),
				averagerating:
					typeof details.vote_average === 'number'
						? Number(details.vote_average.toFixed(1))
						: null
			};
		}
	);
}

export async function refreshShowMetadata(supabase: SupabaseClient) {
	const tmdbKey = Deno.env.get('PRIVATE_TMDB_V3_KEY');
	if (!tmdbKey) {
		throw new Error('Missing PRIVATE_TMDB_V3_KEY');
	}

	let data;
	let error;
	try {
		({ data, error } = await supabase.from('shows').select('id, tmdbid, seasons'));
	} catch (queryError) {
		throw new Error(
			`refreshShowMetadata select failed: ${queryError instanceof Error ? queryError.message : String(queryError)}`
		);
	}
	if (error) {
		throw new Error(`refreshShowMetadata select error: ${error.message || String(error)}`);
	}

	const rows = (data ?? []) as ShowRow[];
	const seriesCache = new Map<number, TmdbShowDetails | null>();
	const seasonCache = new Map<string, TmdbSeasonDetails>();
	const missingSeriesIds = new Set<number>();
	const summary = {
		table: 'shows',
		uniqueIds: new Set(
			rows
				.map((row) => row.tmdbid)
				.filter((id): id is number => typeof id === 'number' && !Number.isNaN(id))
		).size,
		updatedGroups: 0,
		updatedRows: 0,
		skippedGroups: 0,
		failedGroups: 0,
		failedIds: [] as number[]
	};

	// Process metadata fetches concurrently with caching
	const metadataFetches = await runWithConcencyLimit(rows, 10, async (row) => {
		if (typeof row.id !== 'number' || Number.isNaN(row.id)) {
			return { row, updateSource: null, error: null, skipped: true };
		}

		const tmdbId = row.tmdbid;
		if (typeof tmdbId !== 'number' || Number.isNaN(tmdbId)) {
			return { row, updateSource: null, error: null, skipped: true };
		}

		if (missingSeriesIds.has(tmdbId)) {
			return { row, updateSource: null, error: null, skipped: true };
		}

		try {
			let updateSource: TmdbShowDetails | TmdbSeasonDetails;
			const singleSeason = parseSingleSeasonNumber(row.seasons as string | null | undefined);

			if (singleSeason !== null) {
				const seasonKey = `${tmdbId}:${singleSeason}`;
				if (!seasonCache.has(seasonKey)) {
					const seasonDetails = await fetchTmdbJson<TmdbSeasonDetails>(
						`https://api.themoviedb.org/3/tv/${tmdbId}/season/${singleSeason}?api_key=${tmdbKey}&language=de-DE`,
						{ allow404: true }
					);
					if (seasonDetails) {
						seasonCache.set(seasonKey, seasonDetails);
					}
				}

				const seasonDetails = seasonCache.get(seasonKey);
				if (seasonDetails) {
					updateSource = seasonDetails;
				} else {
					if (!seriesCache.has(tmdbId)) {
						const seriesDetails = await fetchTmdbJson<TmdbShowDetails>(
							`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${tmdbKey}&language=de-DE`,
							{ allow404: true }
						);
						seriesCache.set(tmdbId, seriesDetails);
					}

					const seriesDetails = seriesCache.get(tmdbId) ?? null;
					if (!seriesDetails) {
						missingSeriesIds.add(tmdbId);
						return { row, updateSource: null, error: null, skipped: true };
					}

					updateSource = seriesDetails;
				}
			} else {
				if (!seriesCache.has(tmdbId)) {
					const seriesDetails = await fetchTmdbJson<TmdbShowDetails>(
						`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${tmdbKey}&language=de-DE`,
						{ allow404: true }
					);
					seriesCache.set(tmdbId, seriesDetails);
				}
				const seriesDetails = seriesCache.get(tmdbId) ?? null;
				if (!seriesDetails) {
					missingSeriesIds.add(tmdbId);
					return { row, updateSource: null, error: null, skipped: true };
				}
				updateSource = seriesDetails;
			}

			return { row, updateSource, error: null, skipped: false };
		} catch (fetchError) {
			if (fetchError instanceof TmdbHttpError && fetchError.status === 404) {
				return { row, updateSource: null, error: null, skipped: true };
			}
			console.error(`Failed to load show metadata for row ${row.id}`, fetchError);
			return {
				row,
				updateSource: null,
				error: fetchError,
				skipped: false
			};
		}
	});

	// Update database with all fetched metadata concurrently
	const updateResults = await runWithConcencyLimit(
		metadataFetches.filter((r) => r.updateSource !== null && !r.skipped),
		10,
		async (result) => {
			const updateSource = result.updateSource!;
			const releaseValue =
				'air_date' in updateSource
					? toIsoDate(updateSource.air_date)
					: toIsoDate((updateSource as TmdbShowDetails).first_air_date);

			const { data: updatedRows, error: updateError } = await supabase
				.from('shows')
				.update({
					image: updateSource.poster_path
						? `https://image.tmdb.org/t/p/w154/${updateSource.poster_path}`
						: null,
					release: releaseValue,
					averagerating:
						typeof updateSource.vote_average === 'number'
							? Number(updateSource.vote_average.toFixed(1))
							: null
				})
				.eq('id', result.row.id)
				.select('id');

			if (updateError) {
				console.error(`Failed to update shows row ${result.row.id}`, updateError);
				return { success: false, rowCount: 0, tmdbId: result.row.tmdbid };
			}

			return { success: true, rowCount: updatedRows?.length ?? 0, tmdbId: result.row.tmdbid };
		}
	);

	// Aggregate results
	for (const result of metadataFetches) {
		if (result.skipped) {
			summary.skippedGroups += 1;
		} else if (result.error) {
			summary.failedGroups += 1;
			if (typeof result.row.tmdbid === 'number') {
				summary.failedIds.push(result.row.tmdbid);
			}
		}
	}

	for (const result of updateResults) {
		if (result.success) {
			summary.updatedGroups += 1;
			summary.updatedRows += result.rowCount;
		}
	}

	return summary;
}

export async function refreshBookMetadata(supabase: SupabaseClient) {
	let data;
	let error;
	try {
		({ data, error } = await supabase.from('books').select('id, gbid, title, author'));
	} catch (queryError) {
		throw new Error(
			`refreshBookMetadata select failed: ${queryError instanceof Error ? queryError.message : String(queryError)}`
		);
	}
	if (error) {
		throw new Error(`refreshBookMetadata select error: ${error.message || String(error)}`);
	}

	const rows = (data ?? []) as BookRow[];
	const rowsByWorkId = new Map<string, BookRow[]>();
	let legacyIds = 0;
	let missingIds = 0;

	for (const row of rows) {
		const workId = normalizeOpenLibraryWorkId(row.gbid);
		if (!row.gbid) {
			missingIds += 1;
			continue;
		}
		if (!workId) {
			legacyIds += 1;
			continue;
		}

		const groupedRows = rowsByWorkId.get(workId) ?? [];
		groupedRows.push(row);
		rowsByWorkId.set(workId, groupedRows);
	}

	const uniqueIds = [...rowsByWorkId.keys()];
	const summary = {
		table: 'books',
		uniqueIds: uniqueIds.length,
		updatedGroups: 0,
		updatedRows: 0,
		skippedGroups: 0,
		failedGroups: 0,
		failedIds: [] as string[],
		legacyIds,
		missingIds
	};

	const metadataResults = await runWithConcencyLimit(uniqueIds, 1, async (workId) => {
		try {
			const doc = await fetchOpenLibraryWorkMetadata(workId);
			return { workId, doc, error: null };
		} catch (fetchError) {
			console.error(`Failed to load book metadata for ${workId}`, fetchError);
			return { workId, doc: null, error: fetchError };
		}
	});

	const updateResults = await runWithConcencyLimit(
		metadataResults.filter((result) => result.doc !== null && result.error === null),
		3,
		async (result) => {
			const groupedRows = rowsByWorkId.get(result.workId) ?? [];
			let updatedRows = 0;
			let failedRows = 0;

			for (const row of groupedRows) {
				const update = openLibraryDocToUpdate(result.doc!, row);
				const { data: updated, error: updateError } = await supabase
					.from('books')
					.update(update)
					.eq('id', row.id)
					.select('id');

				if (updateError) {
					failedRows += 1;
					console.error(`Failed to update books row ${row.id}`, updateError);
					continue;
				}

				updatedRows += updated?.length ?? 0;
			}

			return { workId: result.workId, updatedRows, failedRows };
		}
	);

	for (const result of metadataResults) {
		if (result.error) {
			summary.failedGroups += 1;
			summary.failedIds.push(result.workId);
		} else if (!result.doc) {
			summary.skippedGroups += 1;
		}
	}

	for (const result of updateResults) {
		if (result.failedRows > 0) {
			summary.failedGroups += 1;
			summary.failedIds.push(result.workId);
		}
		if (result.updatedRows > 0) {
			summary.updatedGroups += 1;
			summary.updatedRows += result.updatedRows;
		}
	}

	return summary;
}

export async function refreshGameMetadata(supabase: SupabaseClient) {
	let data;
	let error;
	try {
		({ data, error } = await supabase.from('games').select('igdbid'));
	} catch (queryError) {
		throw new Error(
			`refreshGameMetadata select failed: ${queryError instanceof Error ? queryError.message : String(queryError)}`
		);
	}
	if (error) {
		throw new Error(`refreshGameMetadata select error: ${error.message || String(error)}`);
	}
	const rows = (data ?? []) as GameRow[];

	const token = await resolveIgdbToken(supabase);
	return refreshAllRows(supabase, 'games', 'igdbid', rows.map((row) => row.igdbid), async (igdbId) => {
		const details = await fetchIgdbJson(
			token,
			`fields cover.image_id, first_release_date, total_rating; where id = ${igdbId}; limit 1;`
		);
		const game = details[0];
		if (!game) {
			return null;
		}

		return {
			image: game.cover?.image_id
				? `https://images.igdb.com/igdb/image/upload/t_cover_big/${game.cover.image_id}.jpg`
				: null,
			release: toGameRelease(game.first_release_date),
			averagerating:
				typeof game.total_rating === 'number'
					? Number((game.total_rating / 10).toFixed(1))
					: null
		};
	});
}
