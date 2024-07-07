import { MovieDb, type PopularMoviesRequest, type MovieResult } from 'moviedb-promise';
import { delay, getBiasedRandom, getRandomNonAdult } from '../../utils.js';
import { PRIVATE_TMDB_V3_KEY } from '$env/static/private';

const RETRIES: number = 5;

/** @type {import('./$types').RequestHandler} */
export async function POST({ request }) {
	const reqBody = await request.json();
	console.log(reqBody['swipedIds'])
	const params: PopularMoviesRequest = {
		language: 'de',
		page: 1,
		region: 'DE'
	};
	const tmdb = new MovieDb(PRIVATE_TMDB_V3_KEY);
	let try_count = 0;
	while (try_count < RETRIES) {
		try {
			params.page = getBiasedRandom(1, 150);
			const movies = await tmdb.moviePopular(params);
			let movieSet: MovieResult[] = []
			movies.results?.forEach(movie => {
				if (!reqBody['swipedIds'].includes(movie.id)) {
					movieSet.push(movie);
				}
				else {
					console.log(`${movie.title} has already been swiped`)
				}
			})
			if (movieSet?.length != 0) {
				// console.log(`Chose movie from page ${params.page}`)
				let chosenMovie = await getRandomNonAdult(movieSet !== undefined ? movieSet : []);
				if (chosenMovie !== undefined) {
					return new Response(
						JSON.stringify(chosenMovie)
					);
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
