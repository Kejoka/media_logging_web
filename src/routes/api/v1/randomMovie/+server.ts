import { MovieDb, type PopularMoviesRequest } from 'moviedb-promise';
import { getRandomNonAdult } from '../../utils.js';
import { PRIVATE_TMDB_V3_KEY } from '$env/static/private';

/** @type {import('./$types').RequestHandler} */
export async function GET({ }) {
    const params: PopularMoviesRequest = {
        language: 'de',
        page: Math.floor(Math.random() * 100),
        region: 'DE'
    }
    const tmdb = new MovieDb(PRIVATE_TMDB_V3_KEY);
    try {
        const movies = await tmdb.moviePopular(params);
        return new Response(JSON.stringify(await getRandomNonAdult(movies.results !== undefined ? movies.results : [])));
    } catch (error) {
        console.log(`Error on Endpoint randomMovie: ${error}`);
        return new Response(String(error));
    }
}