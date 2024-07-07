import { MovieDb, type DiscoverMovieRequest, type MovieResult, type PopularMoviesRequest } from 'moviedb-promise';
import { delay, getBiasedRandom, getRandomNonAdult } from '../../utils.js';
import { PRIVATE_TMDB_V3_KEY } from '$env/static/private';
import { supabase } from '$lib/supabaseClient.js';

const RETRIES: number = 5;

/** @type {import('./$types').RequestHandler} */
export async function POST({ request, url }) {
	const reqBody = await request.json();
	console.log(reqBody['swipedIds'])
	const prefs = await supabase
		.from('preferences')
		.select('tmdb_id, factor')
		.eq('user_preference_id', url.searchParams.get('user_pref_id'))
		.order('factor', { ascending: false })
		.limit(50);
	const tmdb = new MovieDb(PRIVATE_TMDB_V3_KEY);
	if (prefs.count == null) {
		const params: PopularMoviesRequest = {
			language: 'de',
			page: 1,
			region: 'DE'
		};
		let responseMovie: MovieResult;
		let try_count = 0;
		while (try_count < RETRIES) {
			try {
				params.page = getBiasedRandom(1, 50);
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
					let chosenMovie = await getRandomNonAdult(movieSet !== undefined ? movieSet : []);
					if (chosenMovie !== undefined) {
						return new Response(
							JSON.stringify(chosenMovie)
						);
					}
				}
			} catch (error) {
				console.log(`Error on Endpoint randomMovieFromKeyword: ${error}`);
				console.log(`Retrying in 50ms..`);
				await delay(50);
			}
			try_count++;
		}
		return new Response(`No success fetching random movie from keyword after ${RETRIES} retries`);
	} else {
		const randomPref: { tmdb_id: number; factor: number } | undefined = prefs.data?.at(
			getBiasedRandom(1, prefs.data.length)
		);
		const params: DiscoverMovieRequest = {
			page: 1,
			sort_by: 'popularity.desc',
			include_adult: false,
			with_keywords: String(randomPref?.tmdb_id)
		};
		let responseMovie: MovieResult;
		let try_count = 0;
		while (try_count < RETRIES) {
			try {
				params.page = getBiasedRandom(1, 50);
				const movies = await tmdb.discoverMovie(params);
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
					let chosenMovie = await getRandomNonAdult(movieSet !== undefined ? movieSet : []);
					if (chosenMovie !== undefined) {
						return new Response(
							JSON.stringify(chosenMovie)
						);
					}
				}
			} catch (error) {
				console.log(`Error on Endpoint randomMovie: ${error}`);
				console.log(`Retrying in 50ms..`);
				await delay(50);
			}
			try_count++;
		}
		return new Response(`No success fetching random movie from keyword after ${RETRIES} retries`);
	}
}
