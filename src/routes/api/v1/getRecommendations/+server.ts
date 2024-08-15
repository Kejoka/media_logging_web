import { removeAllNonAdultsAndAddScore } from '$lib/utils.js';
import { PRIVATE_TMDB_V3_KEY } from '$env/static/private';
import { supabase } from '$lib/supabaseClient.js';
import type { MovieResult } from '$lib/dbUtils.js';

/** @type {import('./$types').RequestHandler} */
export async function POST({ request, url }) {
	const reqBody = await request.json();
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
	const keywordStrings: string[] = getAllCombinations(
		prefs.data?.slice(0, KEYWORD_MAX - 1) !== undefined
			? prefs.data?.slice(0, KEYWORD_MAX - 1)
			: [],
		MIN_COMBINATION_LENGTH,
		MAX_COMBINATION_LENGTH
	);
	let allRecoMovies: (MovieResult & { score: number })[] = [];
	// Emergency Filler Movies
	// let keywordOrString = '';
	// for (let i = 0; i < KEYWORD_MAX; i++) {
	//     keywordOrString += prefs.data?.at(i)?.tmdb_id + "|";
	// }
	// keywordStrings.push(keywordOrString);
	// Prepare discover params for batched requests
	const discoverParams: { page: number, sort_by: string, include_adult: boolean, with_keywords: string }[] = [];
	for (const keyword of keywordStrings) {
		discoverParams.push({
			page: Number(url.searchParams.get('page') !== undefined ? url.searchParams.get('page') : 1),
			sort_by: 'popularity.desc',
			include_adult: false,
			with_keywords: keyword
		});
	}
	try {
		const responses = await Promise.all(discoverParams.map(async (param) => {
			const raw_res = await fetch(`https://api.themoviedb.org/3/discover/movie?include_adult=${param.include_adult}&include_video=false&language=de-DE&page=${param.page}&sort_by=${param.sort_by}&with_keywords=${param.with_keywords.split(',').join('%2C')}&api_key=${PRIVATE_TMDB_V3_KEY}`)
			return raw_res.json()
		}));
		// filter loaded movies and remove duplicates before requesting keywords
		let loadedMovies: MovieResult[] = [];
		for (const response of responses) {
			const res: MovieResult[] = response.results != undefined ? response.results : [];
			loadedMovies = [...loadedMovies, ...res];
		}
		let movieSet = loadedMovies.filter(
			(obj, index, self) =>
				index === self.findIndex((t) => t.id === obj.id) && !reqBody['movieIds'].includes(obj.id)
		);
		console.log(`Subrequest-Count: ${movieSet.length + keywordStrings.length + 1}`);
		// limit because of cloudflare
		if (movieSet.length + keywordStrings.length + 1 > 50) {
			const maxMovies = 50 - (keywordStrings.length + 1);
			movieSet = movieSet.splice(0, maxMovies);
		}
		// remove non adult and add scores
		let movies = await removeAllNonAdultsAndAddScore(
			movieSet,
			prefs.data !== null ? prefs.data : []
		);
		movies = movies !== undefined ? movies : [];
		if (movies?.length != 0) {
			allRecoMovies = [...allRecoMovies, ...movies];
		}
		allRecoMovies.sort((a, b) => b.score - a.score);
		return new Response(JSON.stringify(allRecoMovies));
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
	minLength: number,
	maxLength: number
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
		if (combination.length > maxLength || combination.length < minLength) {
			continue;
		}
		combination.sort();
		let combinationString: string = '';
		combination.forEach((el) => {
			combinationString += `${el.tmdb_id},`;
		});
		combinations.push(combinationString);
	}
	[...new Set(combinations.shift())];
	return combinations;
}
