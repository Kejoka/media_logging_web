import { MovieDb, type PopularMoviesRequest } from 'moviedb-promise';
import { getRandomNonAdult } from '../../utils.js';
import { PRIVATE_TMDB_V3_KEY } from '$env/static/private';

/** @type {import('./$types').RequestHandler} */
export async function GET({ }) {
    let movies = [];
    let result;
    const params: PopularMoviesRequest = {
        language: 'de',
        page: Math.floor(Math.random() * 100),
        region: 'DE'
    }
    const tmdb = new MovieDb(PRIVATE_TMDB_V3_KEY);
    for (let i = 0; i < 5; i++) {
        try {
            result = await tmdb.moviePopular(params);
            movies.push(await getRandomNonAdult(result.results !== undefined ? result.results : []));
        } catch (error) {
            console.log(`Error on Endpoint initialCards: ${error}`);
            return new Response(String(error))
        }
    }
    return new Response(JSON.stringify(movies));
}
