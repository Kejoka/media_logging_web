import { PRIVATE_TMDB_V3_KEY } from '$env/static/private';
import type { tvSeason } from '$lib/dbUtils.js';
import { supabase } from '$lib/supabaseClient.js';
import { delay } from '$lib/utils.js';
import { error } from 'console';

const RETRIES: number = 3;

/** @type {import('./$types').RequestHandler} */
export async function POST({ request, locals: { supabase, safeGetSession } }) {
    const { session } = await safeGetSession();
    const req_body = await request.json();
    const tmdb_id = req_body['tmdb_id'];
    const medium = req_body['medium'];
    let try_count = 0;
    let res, raw_res;
    while (try_count < RETRIES) {
        try {
            if (medium === 'movies') {
                raw_res = await fetch(`https://api.themoviedb.org/3/movie/${tmdb_id}/watch/providers?api_key=${PRIVATE_TMDB_V3_KEY}`)
            }
            else if (medium === 'shows') {
                raw_res = await fetch(`https://api.themoviedb.org/3/tv/${tmdb_id}/watch/providers?api_key=${PRIVATE_TMDB_V3_KEY}`)
            }
            else {
                throw error(`Invalid medium: ${medium}`);
            }
            res = await raw_res.json();
            return new Response(JSON.stringify(res));
        } catch (error) {
            console.log(`Error on Endpoint getStreamingProviders: ${error}`);
            // Retry after 1s
            console.log(`Retrying in 1s..`);
            await delay(1000);
        }
        try_count++;
    }
    return new Response(`No success fetching streaming providers after ${RETRIES} retries`);
}
