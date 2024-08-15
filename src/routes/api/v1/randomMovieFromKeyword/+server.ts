import { delay, getBiasedRandom, getRandomNonAdult } from '$lib/utils.js';
import { PRIVATE_TMDB_V3_KEY } from '$env/static/private';
import { supabase } from '$lib/supabaseClient.js';
import type { MovieResult } from '$lib/dbUtils.js';

const RETRIES: number = 5;

/** @type {import('./$types').RequestHandler} */
export async function POST({ request, url }) {
	const reqBody = await request.json();
	console.log(reqBody['swipedIds']);
	const prefs = await supabase
		.from('preferences')
		.select('tmdb_id, factor')
		.eq('user_preference_id', url.searchParams.get('user_pref_id'))
		.order('factor', { ascending: false })
		.limit(50);
	if (prefs.count == null) {
		const params = {
			language: 'de-DE',
			page: 1,
			region: 'DE'
		};
		let try_count = 0;
		while (try_count < RETRIES) {
			try {
				params.page = getBiasedRandom(1, 50);
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
					const chosenMovie = await getRandomNonAdult(movieSet !== undefined ? movieSet : []);
					if (chosenMovie !== undefined) {
						return new Response(JSON.stringify(chosenMovie));
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
		const params = {
			page: 1,
			sort_by: 'popularity.desc',
			include_adult: false,
			with_keywords: String(randomPref?.tmdb_id)
		};
		let try_count = 0;
		while (try_count < RETRIES) {
			try {
				params.page = getBiasedRandom(1, 50);
				const raw_res = await fetch(`https://api.themoviedb.org/3/discover/movie?include_adult=${params.include_adult}&include_video=false&language=de-DE&page=${params.page}&sort_by=${params.sort_by}&with_keywords=${params.with_keywords.split(',').join('%2C')}&api_key=${PRIVATE_TMDB_V3_KEY}`)
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
					const chosenMovie = await getRandomNonAdult(movieSet !== undefined ? movieSet : []);
					if (chosenMovie !== undefined) {
						return new Response(JSON.stringify(chosenMovie));
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
