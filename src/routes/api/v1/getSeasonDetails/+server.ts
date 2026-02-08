import { PRIVATE_TMDB_V3_KEY } from '$env/static/private';
import type { tvSeason } from '$lib/dbUtils.js';
import { delay } from '$lib/utils.js';

const RETRIES: number = 3;

/** @type {import('./$types').RequestHandler} */
export async function POST({ request, locals: { supabase, safeGetSession } }) {
	const { session } = await safeGetSession();
	const req_body = await request.json();
	const show_id = req_body['id'];
	let search_results: tvSeason[] = [];

	let try_count = 0;
	let res, raw_res;
	while (try_count < RETRIES) {
		try {
			raw_res = await fetch(
				`https://api.themoviedb.org/3/tv/${show_id}?language=de-DE&api_key=${PRIVATE_TMDB_V3_KEY}`
			);
			res = await raw_res.json();
			(res.seasons as tvSeason[]).forEach((season) => {
				if (season.name != 'Extras') {
					let iso_release;
					if (season.air_date && !isNaN(new Date(season.air_date).getTime())) {
						iso_release = new Date(season.air_date).toISOString();
					} else {
						iso_release = null;
					}
					search_results.push({
						air_date: iso_release,
						episode_count: season.episode_count,
						id: season.id,
						name: season.name,
						poster_path: `https://image.tmdb.org/t/p/w154/${season.poster_path}`,
						vote_average: season.vote_average,
						season_number: season.season_number
					} as tvSeason);
				}
			});
			return new Response(JSON.stringify(search_results));
		} catch (error) {
			console.log(`Error on Endpoint getSeasonDetails: ${error}`);
			// Retry after 1s
			console.log(`Retrying in 1s..`);
			await delay(1000);
		}
		try_count++;
	}
	return new Response(`No success fetching season details after ${RETRIES} retries`);
}
