import { error } from '@sveltejs/kit';
import { MovieDb, type PopularMoviesRequest } from 'moviedb-promise';
import { getRandomNonAdult } from '../../utils.js';
import { SECRET_TMDB_V3_KEY } from '$env/static/private';

/** @type {import('./$types').RequestHandler} */
export async function GET({ }) {

    console.log("Fetching initial cards")
    let movies = [];
    let result;
    const params: PopularMoviesRequest = {
        language: 'de',
        page: Math.floor(Math.random() * 100),
        region: 'DE'
    }
    const tmdb = new MovieDb(SECRET_TMDB_V3_KEY);
    for (let i = 0; i < 5; i++) {
        try {
            result = await tmdb.moviePopular(params);
            movies.push(getRandomNonAdult(result.results !== undefined ? result.results : []));
        } catch (error) {
            console.log("Error on Endpoint initialCards:\n" + error);
            return new Response(String(error))
        }
    }
    return new Response(JSON.stringify(movies));
}
