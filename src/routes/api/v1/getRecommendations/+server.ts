import { MovieDb, type DiscoverMovieRequest, type PopularMoviesRequest } from 'moviedb-promise';
import { removeAllNonAdults } from '../../utils.js';
import { PRIVATE_TMDB_V3_KEY } from '$env/static/private';
import { supabase } from '$lib/supabaseClient.js';

/** @type {import('./$types').RequestHandler} */
export async function GET({ url }) {
    const prefs = await supabase.from('preferences').select('tmdb_id, factor').eq('user_preference_id', url.searchParams.get('user_pref_id')).order('factor', { ascending: false });
    let keyword_string: string = '';
    prefs.data?.forEach(preference => {
        keyword_string += preference.tmdb_id + ' | '
    });
    const params: DiscoverMovieRequest = {
        page: Number(url.searchParams.get('page') !== undefined ? url.searchParams.get('page') : 1),
        sort_by: 'popularity.desc',
        include_adult: false,
        with_keywords: keyword_string
    }
    const tmdb = new MovieDb(PRIVATE_TMDB_V3_KEY);
    try {
        const movies = await tmdb.discoverMovie(params);
        return new Response(
            JSON.stringify(await removeAllNonAdults(movies.results !== undefined ? movies.results : []))
        );
    } catch (error) {
        console.log(`Error on Endpoint randomMovie: ${error}`);
        return new Response(String(error));
    }
}

// export interface DiscoverMovieRequest extends RequestParams {
//     region?: string;
//     sort_by?: 'popularity.asc' | 'popularity.desc' | 'release_date.asc' | 'release_date.desc' | 'revenue.asc' | 'revenue.desc' | 'primary_release_date.asc' | 'primary_release_date.desc' | 'original_title.asc' | 'original_title.desc' | 'vote_average.asc' | 'vote_average.desc' | 'vote_count.asc' | 'vote_count.desc';
//     certification_country?: string;
//     certification?: string;
//     'certification.lte'?: string;
//     'certification.gte'?: string;
//     include_adult?: boolean;
//     include_video?: boolean;
//     page?: number;
//     primary_release_year?: number;
//     'primary_release_date.gte'?: string;
//     'primary_release_date.lte'?: string;
//     'release_date.gte'?: string;
//     'release_date.lte'?: string;
//     with_release_type?: string;
//     year?: number;
//     'vote_count.gte'?: number;
//     'vote_count.lte'?: number;
//     'vote_average.gte'?: number;
//     'vote_average.lte'?: number;
//     with_cast?: string;
//     with_crew?: string;
//     with_people?: string;
//     with_companies?: string;
//     with_genres?: string;
//     without_genres?: string;
//     with_keywords?: string;
//     without_keywords?: string;
//     'with_runtime.gte'?: number;
//     'with_runtime.lte'?: number;
//     with_original_language?: string;
//     with_watch_providers?: string;
//     watch_region?: string;
//     with_watch_monetization_types?: string;
// }
