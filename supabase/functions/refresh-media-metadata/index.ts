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
		const [movies, shows, games] = await Promise.all([
			refreshMovieMetadata(supabase),
			refreshShowMetadata(supabase),
			refreshGameMetadata(supabase)
		]);

		return new Response(JSON.stringify({ ok: true, movies, shows, games }), {
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
