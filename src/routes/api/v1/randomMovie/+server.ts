import { delay, getBiasedRandom, getRandomNonAdult } from '$lib/utils.js';
import { PRIVATE_TMDB_V3_KEY } from '$env/static/private';
import type { MovieResult } from '$lib/dbUtils.js';

const RETRIES: number = 5;

/** @type {import('./$types').RequestHandler} */
export async function POST({ request }) {
	const reqBody = await request.json();
	console.log(reqBody['swipedIds']);
	const params = {
		language: 'de-DE',
		page: 1,
		region: 'DE'
	};
	let try_count = 0;
	while (try_count < RETRIES) {
		try {
			params.page = getBiasedRandom(1, 150);
			const raw_res = await fetch(`https://api.themoviedb.org/3/movie/popular?language=${params.language}&page=${params.page}&region=${params.region}&api_key=${PRIVATE_TMDB_V3_KEY}`)
			const movies = await raw_res.json();
			const movieSet: MovieResult[] = [];
			(movies.results as MovieResult[]).forEach((movie) => {
				if (!reqBody['swipedIds'].includes(movie.id)) {
					movieSet.push(movie);
				} else {
					console.log(`${movie.title} has already been swiped`);
				}
			});
			if (movieSet?.length != 0) {
				// console.log(`Chose movie from page ${params.page}`)
				const chosenMovie = await getRandomNonAdult(movieSet !== undefined ? movieSet : []);
				if (chosenMovie !== undefined) {
					return new Response(JSON.stringify(chosenMovie));
				}
			}
		} catch (error) {
			console.log(`Error on Endpoint randomMovie: ${error}`);
			// Retry after 50ms
			console.log(`Retrying in 50ms..`);
			await delay(50);
		}
		try_count++;
	}
	return new Response(`No success fetching random movie after ${RETRIES} retries`);
}
