import { MovieDb, type DiscoverMovieRequest, type PopularMoviesRequest } from 'moviedb-promise';
import { getRandomNonAdult } from '../../utils.js';
import { PRIVATE_TMDB_V3_KEY } from '$env/static/private';
import { supabase } from '$lib/supabaseClient.js';

/** @type {import('./$types').RequestHandler} */
export async function GET({ url }) {
	const prefs = await supabase.from('preferences').select('tmdb_id, factor').eq('user_preference_id', url.searchParams.get('user_pref_id')).order('factor', { ascending: false }).limit(10);
	const tmdb = new MovieDb(PRIVATE_TMDB_V3_KEY);
	if (prefs == null) {
		const params: PopularMoviesRequest = {
			language: 'de',
			page: Math.floor(Math.random() * 25),
			region: 'DE'
		};
		try {
			const movies = await tmdb.moviePopular(params);
			return new Response(
				JSON.stringify(await getRandomNonAdult(movies.results !== undefined ? movies.results : []))
			);
		} catch (error) {
			console.log(`Error on Endpoint randomMovie: ${error}`);
			return new Response(String(error));
		}
	}
	else {
		const randomPref: { tmdb_id: number, factor: number } | undefined = prefs.data?.at(Math.floor(Math.random() * prefs.data?.length))
		const params: DiscoverMovieRequest = {
			page: 1,
			sort_by: 'popularity.desc',
			include_adult: false,
			with_keywords: String(randomPref?.tmdb_id)
		};
		try {

			const movies = await tmdb.discoverMovie(params);
			return new Response(
				JSON.stringify(await getRandomNonAdult(movies.results !== undefined ? movies.results : []))
			);
		} catch (error) {
			console.log(`Error on Endpoint randomMovie: ${error}`);
			return new Response(String(error));
		}
	}

}
