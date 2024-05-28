/** @type {import('./$types').PageServerLoad} */
export async function load({ fetch }) {
    const res = await fetch('http://localhost:5500/initialCards');
    const movies: TmdbMovie[] = await res.json();

    return { movies };
}

export type TmdbMovie = {
    adult: boolean,
    backdrop_path: string,
    genre_ids: number[],
    id: number,
    overview: string,
    popularity: number,
    poster_path: string,
    release_date: string,
    vote_average: number,
    title: string
}