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
    return ["games", "movies", "shows", "books"][index] || 'error'
}

export async function redoDexieChanges() {
    const changes: OfflineChangeObject[] = JSON.parse((await dexieDB.prefs.toArray()).at(0)?.changed_offline || '')
    const syncTimestamp = new Date();
    let failedChanges: OfflineChangeObject[] = [];
    let res;
    let idChanges = [];
    for (const change of changes) {
        console.log(change)
        idChanges.forEach(idChange => {
            if (idChange.medium === change.medium && idChange.old == change.card.id) {
                change.card.id = idChange.new
            }
        })
        switch (change.event) {
            case 'add':
                try {
                    res = await fetch('/api/v1/addMedium', {
                        method: 'POST',
                        body: JSON.stringify({
                            last_selection: change.card,
                            current_medium: change.medium,
                            syncTimestamp
                        }),
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    });
                    const supabaseRes = await res.json()
                    switch (change.medium) {
                        case 'games':
                            await dexieDB.games.update(change.card.id, { id: supabaseRes.data.id })
                            break;
                        case 'movies':
                            await dexieDB.movies.update(change.card.id, { id: supabaseRes.data.id })
                            break;
                        case 'shows':
                            await dexieDB.shows.update(change.card.id, { id: supabaseRes.data.id })
                            break;
                        case 'books':
                            await dexieDB.books.update(change.card.id, { id: supabaseRes.data.id })
                            break;
                        default:
                            break;
                    }
                    idChanges.push({ old: change.card.id, new: supabaseRes.data.id, medium: change.medium })

                } catch (error) {
                    console.log(error);
                    failedChanges.push(change)
                }
                break;
            case 'delete':
                try {
                    res = await fetch('/api/v1/deleteMedium', {
                        method: 'POST',
                        body: JSON.stringify({ medium_id: change.card.id, current_medium: change.medium, syncTimestamp }),
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    });
                } catch (error) {
                    console.log(error)
                    failedChanges.push(change)
                }
                break;
            case 'update':
                try {
                    res = await fetch('/api/v1/updateMedium', {
                        method: 'POST',
                        body: JSON.stringify({ toEdit: change.card, current_medium: change.medium, syncTimestamp }),
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    });
                } catch (error) {
                    console.log(error)
                    failedChanges.push(change)
                }
                break;
            case 'score':
                try {
                    res = await fetch('/api/v1/updateScore', {
                        method: 'POST',
                        body: JSON.stringify({
                            score: change.card.rating,
                            medium: change.card,
                            current_medium: change.medium,
                            syncTimestamp
                        }),
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    });
                } catch (error) {
                    console.log(error)
                    failedChanges.push(change)
                }
                break;
            case 'episode':
                try {
                    res = await fetch('/api/v1/updateEpisode', {
                        method: 'POST',
                        body: JSON.stringify({
                            new_value: change.card.episode,
                            id: change.card.id,
                            syncTimestamp
                        })
                    });
                } catch (error) {
                    console.log(error)
                    failedChanges.push(change)
                }
                break;
            case 'trophy':
                try {
                    res = await fetch('/api/v1/updateTrophy', {
                        method: 'POST',
                        body: JSON.stringify({
                            new_value: change.card.trophy,
                            id: change.card.id,
                            syncTimestamp
                        })
                    });
                } catch (error) {
                    console.log(error)
                    failedChanges.push(change)
                }
                break;
            default:
                break;
        }
    }
    await dexieDB.prefs.update(0, { updated_at: syncTimestamp.toISOString(), changed_offline: JSON.stringify(failedChanges) });
}

export const dexieDB = new Dexie('MediaDatabase') as Dexie & {
    games: EntityTable<mediaObject, 'id'>;
    movies: EntityTable<mediaObject, 'id'>;
    shows: EntityTable<mediaObject, 'id'>;
    books: EntityTable<mediaObject, 'id'>;
    games_other: EntityTable<mediaObject, 'id'>;
    movies_other: EntityTable<mediaObject, 'id'>;
    shows_other: EntityTable<mediaObject, 'id'>;
    books_other: EntityTable<mediaObject, 'id'>;
    prefs: EntityTable<UserInfo, 'id'>
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
  `,
    games_other: `
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
    movies_other: `
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
    shows_other: `
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
    books_other: `
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
  `,
    prefs: `
    ++id,
    updated_at,
    deleted_offline,
    added_offline,
    updated_offline
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

export type OfflineChangeObject = {
    event: string,
    medium: string,
    card: mediaObject
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

export type UserInfo = {
    id: number,
    updated_at: string,
    changed_offline: string
}