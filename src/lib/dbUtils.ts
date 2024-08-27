import Dexie, { type EntityTable } from "dexie";

export function getYears(db_data: mediaObject[], active_year: string) {
    const currentYear = new Date().getFullYear()
    let uniqueYears = [...new Set(db_data.map(obj => new Date(obj.added || 404).getFullYear()))].sort()
    if (uniqueYears.indexOf(currentYear) == -1) {
        uniqueYears.push(currentYear)
    }
    const newYearObjects = uniqueYears.map(value => ({
        year: value.toString(),
        active: false
    }));
    newYearObjects.push({ year: 'Gesamt', active: false })
    if (newYearObjects.some(obj => obj.year === active_year)) {
        newYearObjects[newYearObjects.findIndex(obj => obj.year === active_year)].active = true;
    }
    else {
        newYearObjects[newYearObjects.findIndex(obj => obj.year === String(currentYear))].active = true;
    }
    return newYearObjects
}

export function indexToMedium(index: number) {
    return ["games", "movies", "shows", "books"][index]
}

export const dexieDB = new Dexie('MediaDatabase') as Dexie & {
    games: EntityTable<mediaObject, 'id'>;
    movies: EntityTable<mediaObject, 'id'>;
    shows: EntityTable<mediaObject, 'id'>;
    books: EntityTable<mediaObject, 'id'>;
};

dexieDB.version(1).stores({
    games: `
    ++id,
    user_id,
    igdbid,
    title,
    image,
    release,
    genres,
    platforms,
    averagerating,
    trophy,
    added,
    rating,
    backlogged,
    notes
  `,
    movies: `
    ++id,
    user_id,
    tmdbid,
    title,
    image,
    release,
    genres,
    averagerating,
    added,
    rating,
    backlogged,
    notes
  `,
    shows: `
    ++id,
    user_id,
    tmdbid,
    title,
    image,
    release,
    genres,
    seasons,
    episode,
    averagerating,
    added,
    rating,
    backlogged,
    notes
  `,
    books: `
    ++id,
    user_id,
    gbid,
    title,
    subtitle,
    image,
    author,
    pagecount,
    release,
    averagerating,
    added,
    rating,
    backlogged,
    notes,
    genres
  `
});

export type mediaObject = {
    id?: number,
    user_id?: string,
    igdbid?: number,
    tmdbid?: number,
    gbid?: number,
    title?: string,
    subtitle?: string,
    pagecount?: number,
    author?: string,
    seasons?: string,
    episode?: number,
    image?: string,
    release?: string,
    genres?: string,
    averagerating?: number,
    added?: string,
    rating?: number,
    backlogged?: number,
    platforms?: string,
    trophy?: number,
    notes?: string,
    averageRating?: number,
    addedIn?: number,
    pageCount?: number
}

export type MovieResult = {
    poster_path?: string;
    adult?: boolean;
    overview?: string;
    release_date?: string;
    genre_ids?: Array<number>;
    id?: number;
    media_type: 'movie';
    original_title?: string;
    original_language?: string;
    title?: string;
    backdrop_path?: string;
    popularity?: number;
    vote_count?: number;
    video?: boolean;
    vote_average?: number;
}
export type TvResult = {
    poster_path?: string;
    popularity?: number;
    id?: number;
    overview?: string;
    backdrop_path?: string;
    vote_average?: number;
    media_type: 'tv';
    first_air_date?: string;
    origin_country?: Array<string>;
    genre_ids?: Array<number>;
    original_language?: string;
    vote_count?: number;
    name?: string;
    original_name?: string;
}