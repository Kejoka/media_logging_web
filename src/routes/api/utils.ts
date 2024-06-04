import { PRIVATE_TMDB_V3_KEY } from "$env/static/private";
import { MovieDb, type MovieResult } from "moviedb-promise";

export function getRandomNonAdult(movies: MovieResult[]) {
    let movie: MovieResult;
    do {
        movie = movies[Math.floor(Math.random() * movies.length)];
    } while (movie.adult)
    return movie;
}