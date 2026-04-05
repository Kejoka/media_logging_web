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

		try {
			result.movies = await refreshMovieMetadata(supabase);
		} catch (error) {
			result.ok = false;
			result.errors.push({
				medium: 'movies',
				message: error instanceof Error ? error.message : String(error)
			});
		}

		try {
			result.shows = await refreshShowMetadata(supabase);
		} catch (error) {
			result.ok = false;
			result.errors.push({
				medium: 'shows',
				message: error instanceof Error ? error.message : String(error)
			});
		}

		try {
			result.games = await refreshGameMetadata(supabase);
		} catch (error) {
			result.ok = false;
			result.errors.push({
				medium: 'games',
				message: error instanceof Error ? error.message : String(error)
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
