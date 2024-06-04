import { error } from '@sveltejs/kit';
import { MovieDb, type PopularMoviesRequest } from 'moviedb-promise';
import { getRandomNonAdult } from '../../utils.js';
import { PRIVATE_TMDB_V3_KEY } from '$env/static/private';

/** @type {import('./$types').RequestHandler} */
export async function GET({ url }) {
    const id = Number(url.searchParams.get('id') ?? '0');
    if (id == 0) {
        return new Response("No movie id has been passed");
    }
    const tmdb = new MovieDb(PRIVATE_TMDB_V3_KEY);
    try {
        const keywords = await tmdb.movieKeywords(id);
        return new Response(JSON.stringify(keywords.keywords !== undefined ? keywords.keywords : []));
    } catch (error) {
        console.log("Error on Endpoint getKeywords:\n" + error);
        return new Response(String(error));
    }
}