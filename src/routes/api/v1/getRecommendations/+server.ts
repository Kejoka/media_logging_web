import { removeAllNonAdultsAndAddScore } from '$lib/utils.js';
import { PRIVATE_TMDB_V3_KEY } from '$env/static/private';
import { supabase } from '$lib/supabaseClient.js';
import type { MovieResult } from '$lib/dbUtils.js';

/** @type {import('./$types').RequestHandler} */
export async function POST({ request, url }) {
	const req_body = await request.json();
	const prefs = await supabase
		.from('preferences')
		.select('tmdb_id, factor')
		.eq('user_preference_id', url.searchParams.get('user_pref_id'))
		.order('factor', { ascending: false });
	if (prefs == null) {
		return new Response(`Error: No preferences found for ${url.searchParams.get('user_pref_id')}`);
	}
	console.log(prefs.data)
	const KEYWORD_MAX = 4;
	const MIN_COMBINATION_LENGTH = 1;
	const MAX_COMBINATION_LENGTH = 3;
	const keyword_strings: string[] = getAllCombinations(
		prefs.data?.slice(0, KEYWORD_MAX - 1) !== undefined
			? prefs.data?.slice(0, KEYWORD_MAX - 1)
			: [],
		MIN_COMBINATION_LENGTH,
		MAX_COMBINATION_LENGTH
	);
	let all_reco_movies: (MovieResult & { score: number })[] = [];
	// Emergency Filler Movies
	// let keyword_or_string = '';
	// for (let i = 0; i < KEYWORD_MAX; i++) {
	//     keyword_or_string += prefs.data?.at(i)?.tmdb_id + "|";
	// }
	// keyword_strings.push(keyword_or_string);
	// Prepare discover params for batched requests
	const discover_params: { page: number, sort_by: string, include_adult: boolean, with_keywords: string }[] = [];
	for (const keyword of keyword_strings) {
		discover_params.push({
			page: Number(url.searchParams.get('page') !== undefined ? url.searchParams.get('page') : 1),
			sort_by: 'popularity.desc',
			include_adult: false,
			with_keywords: keyword
		});
	}
	try {
		const responses = await Promise.all(discover_params.map(async (param) => {
			const raw_res = await fetch(`https://api.themoviedb.org/3/discover/movie?include_adult=${param.include_adult}&include_video=false&language=de-DE&page=${param.page}&sort_by=${param.sort_by}&with_keywords=${param.with_keywords.split(',').join('%2C')}&api_key=${PRIVATE_TMDB_V3_KEY}`)
			return raw_res.json()
		}));
		// filter loaded movies and remove duplicates before requesting keywords
		let loaded_movies: MovieResult[] = [];
		for (const response of responses) {
			const res: MovieResult[] = response.results != undefined ? response.results : [];
			loaded_movies = [...loaded_movies, ...res];
		}
		let movie_set = loaded_movies.filter(
			(obj, index, self) =>
				index === self.findIndex((t) => t.id === obj.id) && !req_body['movie_ids'].includes(obj.id)
		);
		console.log(`Subrequest-Count: ${movie_set.length + keyword_strings.length + 1}`);
		// limit because of cloudflare
		if (movie_set.length + keyword_strings.length + 1 > 50) {
			const max_movies = 50 - (keyword_strings.length + 1);
			movie_set = movie_set.splice(0, max_movies);
		}
		// remove non adult and add scores
		let movies = await removeAllNonAdultsAndAddScore(
			movie_set,
			prefs.data !== null ? prefs.data : []
		);
		movies = movies !== undefined ? movies : [];
		if (movies?.length != 0) {
			all_reco_movies = [...all_reco_movies, ...movies];
		}
		all_reco_movies.sort((a, b) => b.score - a.score);
		return new Response(JSON.stringify(all_reco_movies));
	} catch (error) {
		console.error(`Error on Endpoint randomMovie: ${error}`);
		return new Response(String(error), { status: 500 });
	}
}

function getAllCombinations(
	arr: {
		tmdb_id: number;
		factor: number;
	}[],
	min_length: number,
	max_length: number
) {
	const combinations: string[] = [];
	for (let i = 0; i < Math.pow(2, arr.length); i++) {
		const combination = [];
		for (let j = 0; j < arr.length; j++) {
			if ((i >> j) & 1) {
				combination.push(arr[j]);
			}
		}
		combination.sort();
		if (combination.length > max_length || combination.length < min_length) {
			continue;
		}
		combination.sort();
		let combination_string: string = '';
		combination.forEach((el) => {
			combination_string += `${el.tmdb_id},`;
		});
		combinations.push(combination_string);
	}
	[...new Set(combinations.shift())];
	return combinations;
}
