import { MovieDb, type DiscoverMovieRequest, type MovieResult, type PopularMoviesRequest } from 'moviedb-promise';
import { removeAllNonAdultsAndAddScore } from '../../utils.js';
import { PRIVATE_TMDB_V3_KEY } from '$env/static/private';
import { supabase } from '$lib/supabaseClient.js';

/** @type {import('./$types').RequestHandler} */
export async function GET({ url }) {
    const prefs = await supabase.from('preferences').select('tmdb_id, factor').eq('user_preference_id', url.searchParams.get('user_pref_id')).order('factor', { ascending: false });
    if (prefs == null) {
        return new Response(`Error: No preferences found for ${url.searchParams.get('user_pref_id')}`);
    }
    const KEYWORD_MAX = 5;
    const MIN_COMBINATION_LENGTH = 2
    const MAX_COMBINATION_LENGTH = 3;
    let keywordStrings: string[] = getAllCombinations(prefs.data?.slice(0, KEYWORD_MAX - 1) !== undefined ? prefs.data?.slice(0, KEYWORD_MAX - 1) : [], MIN_COMBINATION_LENGTH, MAX_COMBINATION_LENGTH);
    let allRecoMovies: (MovieResult & { score: number })[] = [];
    // Emergency Filler Movies
    let keywordOrString = '';
    for (let i = 0; i < KEYWORD_MAX; i++) {
        keywordOrString += prefs.data?.at(i)?.tmdb_id + "|";
    }
    keywordStrings.push(keywordOrString);

    try {
        const tmdb = new MovieDb(PRIVATE_TMDB_V3_KEY);
        for (const keyword of keywordStrings) {
            const params: DiscoverMovieRequest = {
                page: Number(url.searchParams.get('page') !== undefined ? url.searchParams.get('page') : 1),
                sort_by: 'popularity.desc',
                include_adult: false,
                with_keywords: keyword
            };

            const response = await tmdb.discoverMovie(params);
            let movies = await removeAllNonAdultsAndAddScore(response.results !== undefined ? response.results : [], prefs.data !== null ? prefs.data : [])
            movies = movies !== undefined ? movies : [];
            if (movies?.length != 0) {
                allRecoMovies = [...allRecoMovies, ...movies];
            }
        }
        allRecoMovies.sort((a, b) => b.score - a.score);
        return new Response(JSON.stringify(allRecoMovies));

    } catch (error) {
        console.error(`Error on Endpoint randomMovie: ${error}`);
        return new Response(String(error), { status: 500 });
    }
}

function getAllCombinations(arr: {
    tmdb_id: any;
    factor: any;
}[], minLength: number, maxLength: number) {
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
        combination.forEach(el => {
            combinationString += `${el.tmdb_id},`
        })
        combinations.push(combinationString);
    }
    [...new Set(combinations.shift())];
    return combinations;
}
