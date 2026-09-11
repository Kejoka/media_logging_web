import {
	PRIVATE_IGDB_CLIENT,
	PRIVATE_IGDB_SECRET,
	PRIVATE_IGDB_TOKEN,
	PRIVATE_TMDB_V3_KEY
} from '$env/static/private';
import { env as privateEnv } from '$env/dynamic/private';
import { PUBLIC_IGDB_SUPABASE } from '$env/static/public';
import type { mediaObject, MovieResult, TvResult } from '$lib/dbUtils.js';
import movieGenres from '$lib/movieGenres.js';
import tvGenres from '$lib/tvGenres.js';
import { delay, format_music_genres } from '$lib/utils.js';
import { CoverArtArchiveApi, MusicBrainzApi } from 'musicbrainz-api';

const RETRIES: number = 3;
const OPENLIBRARY_CONTACT_EMAIL = privateEnv.PRIVATE_OPENLIBRARY_CONTACT_EMAIL;
const MUSICBRAINZ_CONTACT =
	privateEnv.PRIVATE_MUSICBRAINZ_CONTACT || OPENLIBRARY_CONTACT_EMAIL || 'media-logging-web';
const musicBrainzApi = new MusicBrainzApi({
	appName: 'media-logging-web',
	appVersion: import.meta.env.VITE_APP_VERSION || '0.0.1',
	appContactInfo: MUSICBRAINZ_CONTACT
});
const coverArtArchiveApi = new CoverArtArchiveApi();

type MusicReleaseGroup = {
	id?: string;
	title?: string;
	'first-release-date'?: string;
	'primary-type'?: string;
	'artist-credit'?: Array<{ name?: string }>;
	genres?: Array<{ name?: string }>;
	tags?: Array<{ name?: string }>;
	rating?: { value?: number | null };
};

type OpenLibraryDoc = {
	key?: string;
	title?: string;
	subtitle?: string;
	author_name?: string[];
	first_publish_year?: number;
	first_publish_date?: string;
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

function getOpenLibraryHeaders() {
	const headers: Record<string, string> = {
		Accept: 'application/json',
		'User-Agent': OPENLIBRARY_CONTACT_EMAIL
			? `media-logging-web/1.0 (${OPENLIBRARY_CONTACT_EMAIL})`
			: 'media-logging-web/1.0'
	};

	if (OPENLIBRARY_CONTACT_EMAIL) {
		headers.From = OPENLIBRARY_CONTACT_EMAIL;
	}

	return headers;
}

function normalizeOpenLibraryWorkId(key: string | undefined) {
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
		return undefined;
	}

	const normalizedSubjects = subjects.map(normalizeSubject).filter(Boolean);
	const genres: string[] = [];

	for (const [genre, needles] of BOOK_GENRE_RULES) {
		if (normalizedSubjects.some((subject) => needles.some((needle) => subject.includes(needle)))) {
			genres.push(genre);
		}
	}

	return genres.length ? genres.slice(0, 4).join(', ') : undefined;
}

function mapOpenLibraryDocToMedia(doc: OpenLibraryDoc): mediaObject | null {
	const workId = normalizeOpenLibraryWorkId(doc.key);
	if (!workId || !doc.title) {
		return null;
	}

	return {
		gbid: workId,
		title: doc.title,
		subtitle: doc.subtitle,
		author: doc.author_name?.join(', '),
		release: toOpenLibraryRelease(doc) ?? undefined,
		image: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : undefined,
		pagecount: doc.number_of_pages_median,
		averagerating:
			typeof doc.ratings_average === 'number' ? Number(doc.ratings_average.toFixed(1)) : undefined,
		genres: mapOpenLibrarySubjectsToGenres(doc.subject)
	};
}

function toMusicReleaseDate(value?: string) {
	if (!value) return null;
	const match = value.match(/^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?/);
	if (!match) return null;
	const year = Number(match[1]);
	const month = Number(match[2] || 1);
	const day = Number(match[3] || 1);
	const date = new Date(Date.UTC(year, month - 1, day));
	return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function mapMusicReleaseGroupToMedia(group: MusicReleaseGroup): mediaObject | null {
	const musicType = group['primary-type']?.toLowerCase();
	if (!group.id || !group.title || !['album', 'ep', 'single'].includes(musicType || '')) {
		return null;
	}

	const genres = format_music_genres(
		(group.genres || group.tags || [])
			.map((entry) => entry.name?.trim())
			.filter((entry): entry is string => Boolean(entry))
			.slice(0, 5)
			.join(', ')
	);
	const rating = group.rating?.value;

	return {
		mbid: group.id,
		title: group.title,
		artist: group['artist-credit']
			?.map((credit) => credit.name?.trim())
			.filter(Boolean)
			.join(', '),
		music_type: musicType,
		release: toMusicReleaseDate(group['first-release-date']) || undefined,
		genres,
		averagerating: typeof rating === 'number' ? Number((rating * 2).toFixed(1)) : undefined
	};
}

async function addMusicCoverArt(medium: mediaObject): Promise<mediaObject> {
	if (!medium.mbid) return medium;

	try {
		const cover = await coverArtArchiveApi.getReleaseGroupCover(medium.mbid, 'front');
		return { ...medium, image: cover.url || undefined };
	} catch (error) {
		console.warn(`Cover art unavailable for MusicBrainz release group ${medium.mbid}`, error);
		return medium;
	}
}

/** @type {import('./$types').RequestHandler} */
export async function POST({ request, locals: { supabase, safeGetSession } }) {
	const { session } = await safeGetSession();
	const request_body = (await request.json()) as {
		search_val: string;
		search_author?: string;
		last_search_page: number;
		current_medium: string;
	};
	const search_val = request_body.search_val;
	const search_author = request_body.search_author?.trim() ?? '';
	const search_page = request_body.last_search_page;
	const current_medium = request_body.current_medium;
	let search_results: mediaObject[] = [];

	const params = {
		adult: false,
		query: search_val,
		language: 'de-DE',
		page: search_page
	};
	let try_count = 0;
	let res, raw_res;
	while (try_count < RETRIES) {
		try {
			switch (current_medium) {
				case 'games':
					// IGDB tokens can expire between requests. We keep one shared token in Supabase
					// and refresh it only when expired to avoid unnecessary auth requests.
					let igdb_token: string = '';
					if (PUBLIC_IGDB_SUPABASE == 'true') {
						const sync_timestamp = new Date();
						const igdb_token_store_record: {
							id: number;
							token: string;
							created: string;
							expires_in: number;
						} = (await supabase.from('igdb_store').select().single()).data;
						if (!igdb_token_store_record) {
							console.log('No igdb data stored yet, requesting new token..');
							const token_refresh_request = (await fetch(
								`https://id.twitch.tv/oauth2/token?client_id=${PRIVATE_IGDB_CLIENT}&client_secret=${PRIVATE_IGDB_SECRET}&grant_type=client_credentials`,
								{
									method: 'POST',
									headers: {
										Accept: 'application/json'
									}
								}
							).then(async (res) => await res.json())) as {
								access_token: string;
								expires_in: number;
								[token: string]: any;
							};
							try {
								console.log('New token received - ', token_refresh_request);
								const res = await supabase.from('igdb_store').insert({
									token: token_refresh_request.access_token,
									created: sync_timestamp.toISOString(),
									expires_in: token_refresh_request.expires_in
								});
								console.log('Added new token to supabase');
								igdb_token = token_refresh_request.access_token;
							} catch (error) {
								console.log(error);
							}
						} else {
							console.log('Stored idgb token found');
							const expire_date_check = new Date(igdb_token_store_record.created);
							expire_date_check.setSeconds(
								expire_date_check.getSeconds() + igdb_token_store_record.expires_in
							);
							// Refresh only when needed so all requests can keep using the same valid token.
							if (expire_date_check < sync_timestamp) {
								console.log('Token has already expired. Requesting new token...');
								const token_refresh_request = (await fetch(
									`https://id.twitch.tv/oauth2/token?client_id=${PRIVATE_IGDB_CLIENT}&client_secret=${PRIVATE_IGDB_SECRET}&grant_type=client_credentials`,
									{
										method: 'POST',
										headers: {
											Accept: 'application/json'
										}
									}
								).then(async (res) => await res.json())) as {
									access_token: string;
									expires_in: number;
									[token: string]: any;
								};
								try {
									console.log('Received new token - ', token_refresh_request);
									const res = await supabase
										.from('igdb_store')
										.update({
											token: token_refresh_request.access_token,
											created: sync_timestamp.toISOString(),
											expires_in: token_refresh_request.expires_in
										})
										.eq('id', igdb_token_store_record.id);
									console.log('Supabase Token has been updated');
									igdb_token = token_refresh_request.access_token;
								} catch (error) {
									console.log(error);
								}
							} else {
								console.log('Supabase token has not expired yet. Using said token..');
								igdb_token = igdb_token_store_record.token;
							}
						}
					} else {
						igdb_token = PRIVATE_IGDB_TOKEN;
					}
					res = await fetch('https://api.igdb.com/v4/games', {
						method: 'POST',
						headers: {
							'Client-ID': PRIVATE_IGDB_CLIENT,
							Authorization: `Bearer ${igdb_token}`,
							Accept: 'application/json'
						},
						body: `fields name, cover.image_id, platforms.abbreviation, genres.name, first_release_date, total_rating; where (name ~ *\"${search_val}\"* & game_type = (0,2,4,8,9,10,11) & version_parent = 'null' & cover != 'null); sort first_release_date desc; limit 20; offset ${(search_page - 1) * 20};`
					});
					const igdb_search_response: any[] = await res.json();
					igdb_search_response.forEach((result) => {
						let release_date_iso_format;
						if (
							result.first_release_date &&
							!isNaN(new Date(result.first_release_date * 1000).getTime())
						) {
							release_date_iso_format = new Date(result.first_release_date * 1000).toISOString();
						} else {
							release_date_iso_format = null;
						}
						let genres: string[] = [];
						result.genres?.forEach((genre: { id: number; name: string }) => {
							genres.push(genre.name);
						});
						let platforms: string[] = [];
						result.platforms?.forEach((platform: { id: number; abbreviation: string }) => {
							platforms.push(platform.abbreviation);
						});
						search_results.push({
							igdbid: result.id,
							title: result.name,
							image: `https://images.igdb.com/igdb/image/upload/t_cover_big/${result.cover.image_id}.jpg`,
							release: release_date_iso_format,
							genres: genres.join(', '),
							platforms: platforms.join(', '),
							averagerating: result.total_rating
						} as mediaObject);
					});
					return new Response(JSON.stringify(search_results));
				case 'movies':
					raw_res = await fetch(
						`https://api.themoviedb.org/3/search/movie?query=${params.query}&include_adult=${params.adult}&language=${params.language}&page=${params.page}&api_key=${PRIVATE_TMDB_V3_KEY}`
					);
					res = (await raw_res.json()) as { results: MovieResult[] };
					(res.results as MovieResult[]).forEach((result) => {
						let iso_release;
						if (result.release_date && !isNaN(new Date(result.release_date).getTime())) {
							iso_release = new Date(result.release_date).toISOString();
						} else {
							iso_release = null;
						}
						let genres: string[] = [];
						result.genre_ids?.forEach((genre_id) => {
							if (movieGenres.genres[movieGenres.genres.findIndex((obj) => obj.id == genre_id)]) {
								genres.push(
									movieGenres.genres[movieGenres.genres.findIndex((obj) => obj.id == genre_id)].name
								);
							}
						});
						search_results.push({
							tmdbid: result.id,
							title: result.title,
							image: `https://image.tmdb.org/t/p/w154/${result.poster_path}`,
							release: iso_release,
							genres: genres.join(', '),
							averagerating: result.vote_average
						} as mediaObject);
					});
					return new Response(JSON.stringify(search_results));
				case 'shows':
					raw_res = await fetch(
						`https://api.themoviedb.org/3/search/tv?query=${params.query}&include_adult=${params.adult}&language=${params.language}&page=${params.page}&api_key=${PRIVATE_TMDB_V3_KEY}`
					);
					res = (await raw_res.json()) as { results: TvResult[] };
					(res.results as TvResult[]).forEach((result) => {
						let iso_release;
						if (result.first_air_date && !isNaN(new Date(result.first_air_date).getTime())) {
							iso_release = new Date(result.first_air_date).toISOString();
						} else {
							iso_release = null;
						}
						let genres: string[] = [];
						result.genre_ids?.forEach((genre_id) => {
							if (tvGenres.genres[tvGenres.genres.findIndex((obj) => obj.id == genre_id)]) {
								genres.push(
									tvGenres.genres[tvGenres.genres.findIndex((obj) => obj.id == genre_id)].name
								);
							}
						});
						search_results.push({
							tmdbid: result.id,
							title: result.name,
							image: `https://image.tmdb.org/t/p/w154/${result.poster_path}`,
							release: iso_release,
							genres: genres.join(', '),
							averagerating: result.vote_average
						} as mediaObject);
					});
					return new Response(JSON.stringify(search_results));
				case 'books':
					const books_url = new URL('https://openlibrary.org/search.json');
					books_url.searchParams.set('q', search_val);
					if (search_author) {
						books_url.searchParams.set('author', search_author);
					}
					books_url.searchParams.set('page', String(search_page));
					books_url.searchParams.set('limit', '20');
					books_url.searchParams.set(
						'fields',
						[
							'key',
							'title',
							'subtitle',
							'author_name',
							'first_publish_year',
							'first_publish_date',
							'cover_i',
							'number_of_pages_median',
							'ratings_average',
							'subject'
						].join(',')
					);
					const raw_book_res = await fetch(books_url.toString(), {
						headers: getOpenLibraryHeaders()
					});
					if (!raw_book_res.ok) {
						throw new Error(`OpenLibrary request failed with status ${raw_book_res.status}`);
					}
					const book_res = (await raw_book_res.json()) as OpenLibrarySearchResponse;

					book_res.docs?.forEach((book) => {
						const mappedBook = mapOpenLibraryDocToMedia(book);
						if (mappedBook) {
							search_results.push(mappedBook);
						}
					});
					return new Response(JSON.stringify(search_results));
				case 'music': {
					const music_response = await musicBrainzApi.search('release-group', {
						query: search_val,
						limit: 50,
						offset: Math.max(search_page - 1, 0) * 50,
						inc: ['artist-credits', 'genres', 'ratings']
					});
					const music_groups = (music_response['release-groups'] || []) as MusicReleaseGroup[];
					const music_candidates: mediaObject[] = [];
					for (const group of music_groups) {
						const mappedMusic = mapMusicReleaseGroupToMedia(group);
						if (mappedMusic) {
							music_candidates.push(mappedMusic);
						}
						if (music_candidates.length >= 20) break;
					}
					search_results.push(...(await Promise.all(music_candidates.map(addMusicCoverArt))));
					return new Response(JSON.stringify(search_results));
				}
				default:
					break;
			}
		} catch (error) {
			console.log(`Error on Endpoint getSearchSuggestions: ${error}`);
			// Retry after 50ms
			console.log(`Retrying in 1s..`);
			await delay(1000);
		}
		try_count++;
	}
	return new Response(`No success fetching search suggestions after ${RETRIES} retries`);
}
