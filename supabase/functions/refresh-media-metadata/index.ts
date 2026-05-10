import {
	refreshGameMetadata,
	refreshMovieMetadata,
	refreshShowMetadata
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
			errors: Array<{ medium: 'movies' | 'shows' | 'games'; message: string }>;
		} = {
			ok: true,
			movies: null,
			shows: null,
			games: null,
			errors: []
		};

		// Run all three refresh functions concurrently instead of sequentially
		const [moviesResult, showsResult, gamesResult] = await Promise.allSettled([
			refreshMovieMetadata(supabase),
			refreshShowMetadata(supabase),
			refreshGameMetadata(supabase)
		]);

		// Handle movie metadata result
		if (moviesResult.status === 'fulfilled') {
			result.movies = moviesResult.value;
		} else {
			result.ok = false;
			result.errors.push({
				medium: 'movies',
				message: moviesResult.reason instanceof Error ? moviesResult.reason.message : String(moviesResult.reason)
			});
		}

		// Handle show metadata result
		if (showsResult.status === 'fulfilled') {
			result.shows = showsResult.value;
		} else {
			result.ok = false;
			result.errors.push({
				medium: 'shows',
				message: showsResult.reason instanceof Error ? showsResult.reason.message : String(showsResult.reason)
			});
		}

		// Handle game metadata result
		if (gamesResult.status === 'fulfilled') {
			result.games = gamesResult.value;
		} else {
			result.ok = false;
			result.errors.push({
				medium: 'games',
				message: gamesResult.reason instanceof Error ? gamesResult.reason.message : String(gamesResult.reason)
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
