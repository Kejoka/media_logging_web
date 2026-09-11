import {
	refreshBookMetadata,
	refreshGameMetadata,
	refreshMovieMetadata,
	refreshShowMetadata,
	refreshMusicMetadata
} from '../_shared/media.ts';
import { getSupabaseAdminClient } from '../_shared/supabase.ts';

const headers = {
	'content-type': 'application/json; charset=utf-8'
};

Deno.serve(async () => {
	try {
		const supabase = getSupabaseAdminClient(Deno.env.toObject());
		const result: {
			ok: boolean;
			movies: unknown;
			shows: unknown;
			games: unknown;
			books: unknown;
			music: unknown;
			errors: Array<{ medium: 'movies' | 'shows' | 'games' | 'books' | 'music'; message: string }>;
		} = {
			ok: true,
			movies: null,
			shows: null,
			games: null,
			books: null,
			music: null,
			errors: []
		};

		// Run refresh functions concurrently instead of sequentially
		const [moviesResult, showsResult, gamesResult, booksResult, musicResult] =
			await Promise.allSettled([
				refreshMovieMetadata(supabase),
				refreshShowMetadata(supabase),
				refreshGameMetadata(supabase),
				refreshBookMetadata(supabase),
				refreshMusicMetadata(supabase)
			]);

		// Handle movie metadata result
		if (moviesResult.status === 'fulfilled') {
			result.movies = moviesResult.value;
		} else {
			result.ok = false;
			result.errors.push({
				medium: 'movies',
				message:
					moviesResult.reason instanceof Error
						? moviesResult.reason.message
						: String(moviesResult.reason)
			});
		}

		// Handle show metadata result
		if (showsResult.status === 'fulfilled') {
			result.shows = showsResult.value;
		} else {
			result.ok = false;
			result.errors.push({
				medium: 'shows',
				message:
					showsResult.reason instanceof Error
						? showsResult.reason.message
						: String(showsResult.reason)
			});
		}

		// Handle game metadata result
		if (gamesResult.status === 'fulfilled') {
			result.games = gamesResult.value;
		} else {
			result.ok = false;
			result.errors.push({
				medium: 'games',
				message:
					gamesResult.reason instanceof Error
						? gamesResult.reason.message
						: String(gamesResult.reason)
			});
		}

		// Handle book metadata result
		if (booksResult.status === 'fulfilled') {
			result.books = booksResult.value;
		} else {
			result.ok = false;
			result.errors.push({
				medium: 'books',
				message:
					booksResult.reason instanceof Error
						? booksResult.reason.message
						: String(booksResult.reason)
			});
		}

		if (musicResult.status === 'fulfilled') {
			result.music = musicResult.value;
		} else {
			result.ok = false;
			result.errors.push({
				medium: 'music',
				message:
					musicResult.reason instanceof Error
						? musicResult.reason.message
						: String(musicResult.reason)
			});
		}

		return new Response(JSON.stringify(result), {
			status: result.ok ? 200 : 207,
			headers
		});
	} catch (error) {
		console.error('refresh-media-metadata failed', error);
		return new Response(
			JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }),
			{
				status: 500,
				headers
			}
		);
	}
});
