import { PRIVATE_IGDB_CLIENT, PRIVATE_IGDB_SECRET, PRIVATE_IGDB_TOKEN, PRIVATE_TMDB_V3_KEY } from '$env/static/private';
import { PUBLIC_IGDB_SUPABASE } from '$env/static/public';
import type { mediaObject, MovieResult, TvResult } from '$lib/dbUtils.js';
import movieGenres from '$lib/movieGenres.js';
import { supabase } from '$lib/supabaseClient.js';
import tvGenres from '$lib/tvGenres.js';
import { delay } from '$lib/utils.js';
import { search } from '@chewhx/google-books';

const RETRIES: number = 3;

/** @type {import('./$types').RequestHandler} */
export async function POST({ request, locals: { supabase, safeGetSession } }) {
    const { session } = await safeGetSession();
    const req_body = await request.json();
    const search_val = req_body['search_val'];
    const search_page = req_body['last_search_page'];
    const current_medium = req_body['current_medium'];
    let search_results: mediaObject[] = [];

    const params = {
        adult: false,
        query: search_val,
        language: 'de-DE',
        page: search_page
    }
    let try_count = 0;
    let res, raw_res;
    while (try_count < RETRIES) {
        try {
            switch (current_medium) {
                case 'games':
                    let igdb_token: string = '';
                    if (PUBLIC_IGDB_SUPABASE == 'true') {
                        const sync_timestamp = new Date();
                        const igdb_res: { id: number, token: string, created: string, expires_in: number } = (await supabase.from('igdb_store').select().single()).data
                        if (!igdb_res) {
                            console.log("No igdb data stored yet, requesting new token..")
                            const token_req = await fetch(`https://id.twitch.tv/oauth2/token?client_id=${PRIVATE_IGDB_CLIENT}&client_secret=${PRIVATE_IGDB_SECRET}&grant_type=client_credentials`, {
                                method: 'POST',
                                headers: {
                                    'Accept': 'application/json'
                                }
                            }).then(async res => await res.json())
                            try {
                                console.log("New token received - ", token_req)
                                const res = await supabase.from('igdb_store').insert({
                                    token: token_req.access_token,
                                    created: sync_timestamp.toISOString(),
                                    expires_in: token_req.expires_in
                                })
                                console.log("Added new token to supabase")
                                igdb_token = token_req.access_token
                            } catch (error) {
                                console.log(error)
                            }
                        } else {
                            console.log("Stored idgb token found")
                            const expire_date_check = new Date(igdb_res.created)
                            expire_date_check.setSeconds(expire_date_check.getSeconds() + igdb_res.expires_in)
                            if (expire_date_check < sync_timestamp) {
                                console.log("Token has already expired. Requesting new token...")
                                const token_req = await fetch(`https://id.twitch.tv/oauth2/token?client_id=${PRIVATE_IGDB_CLIENT}&client_secret=${PRIVATE_IGDB_SECRET}&grant_type=client_credentials`, {
                                    method: 'POST',
                                    headers: {
                                        'Accept': 'application/json'
                                    }
                                }).then(async res => await res.json())
                                try {
                                    console.log("Received new token - ", token_req)
                                    const res = await supabase.from('igdb_store').update({
                                        token: token_req.access_token,
                                        created: sync_timestamp.toISOString(),
                                        expires_in: token_req.expires_in
                                    }).eq('id', igdb_res.id)
                                    console.log("Supabase Token has been updated")
                                    igdb_token = token_req.access_token
                                } catch (error) {
                                    console.log(error)
                                }
                            } else {
                                console.log("Supabase token has not expired yet. Using said token..")
                                igdb_token = igdb_res.token
                            }
                        }
                    }
                    else {
                        igdb_token = PRIVATE_IGDB_TOKEN
                    }
                    res = await fetch('https://api.igdb.com/v4/games', {
                        method: 'POST',
                        headers: {
                            'Client-ID': PRIVATE_IGDB_CLIENT,
                            'Authorization': `Bearer ${igdb_token}`,
                            'Accept': 'application/json'
                        },
                        body: `fields name, cover.image_id, platforms.abbreviation, genres.name, first_release_date, total_rating; where (name ~ *\"${search_val}\"* & category = (0,2,4,8,9,10,11) & version_parent = 'null' & cover != 'null); sort first_release_date desc; limit 20; offset ${(search_page - 1) * 20};`
                    })
                    const igdb_res: any[] = await res.json();
                    igdb_res.forEach(result => {
                        let iso_release
                        if (result.first_release_date && !isNaN(new Date(result.first_release_date * 1000).getTime())) {
                            iso_release = new Date(result.first_release_date * 1000).toISOString();
                        } else {
                            iso_release = null;
                        }
                        let genres: string[] = []
                        result.genres?.forEach((genre: { id: number, name: string }) => {
                            genres.push(genre.name)
                        })
                        let platforms: string[] = []
                        result.platforms?.forEach((platform: { id: number, abbreviation: string }) => {
                            platforms.push(platform.abbreviation)
                        })
                        search_results.push(
                            {
                                igdbid: result.id,
                                title: result.name,
                                image: `https://images.igdb.com/igdb/image/upload/t_cover_big/${result.cover.image_id}.jpg`,
                                release: iso_release,
                                genres: genres.join(', '),
                                platforms: platforms.join(', '),
                                averagerating: result.total_rating,
                            } as mediaObject
                        )
                    })
                    return new Response(JSON.stringify(search_results));
                case 'movies':
                    raw_res = await fetch(`https://api.themoviedb.org/3/search/movie?query=${params.query}&include_adult=${params.adult}&language=${params.language}&page=${params.page}&api_key=${PRIVATE_TMDB_V3_KEY}`);
                    res = await raw_res.json();
                    (res.results as MovieResult[]).forEach(result => {
                        let iso_release;
                        if (result.release_date && !isNaN(new Date(result.release_date).getTime())) {
                            iso_release = new Date(result.release_date).toISOString();
                        } else {
                            iso_release = null;
                        }
                        let genres: string[] = []
                        result.genre_ids?.forEach(genre_id => {
                            if (movieGenres.genres[movieGenres.genres.findIndex(obj => obj.id == genre_id)]) {
                                genres.push(movieGenres.genres[movieGenres.genres.findIndex(obj => obj.id == genre_id)].name)
                            }
                        })
                        search_results.push(
                            {
                                tmdbid: result.id,
                                title: result.title,
                                image: `https://image.tmdb.org/t/p/w154/${result.poster_path}`,
                                release: iso_release,
                                genres: genres.join(', '),
                                averagerating: result.vote_average,
                            } as mediaObject
                        )
                    })
                    return new Response(JSON.stringify(search_results));
                case 'shows':
                    raw_res = await fetch(`https://api.themoviedb.org/3/search/tv?query=${params.query}&include_adult=${params.adult}&language=${params.language}&page=${params.page}&api_key=${PRIVATE_TMDB_V3_KEY}`)
                    res = await raw_res.json();
                    (res.results as TvResult[]).forEach(result => {
                        let iso_release;
                        if (result.first_air_date && !isNaN(new Date(result.first_air_date).getTime())) {
                            iso_release = new Date(result.first_air_date).toISOString();
                        } else {
                            iso_release = null;
                        }
                        let genres: string[] = []
                        result.genre_ids?.forEach(genre_id => {
                            if (tvGenres.genres[tvGenres.genres.findIndex(obj => obj.id == genre_id)]) {
                                genres.push(tvGenres.genres[tvGenres.genres.findIndex(obj => obj.id == genre_id)].name)
                            }
                        })
                        search_results.push(
                            {
                                tmdbid: result.id,
                                title: result.name,
                                image: `https://image.tmdb.org/t/p/w154/${result.poster_path}`,
                                release: iso_release,
                                genres: genres.join(', '),
                                averagerating: result.vote_average,
                            } as mediaObject
                        )
                    })
                    return new Response(JSON.stringify(search_results));
                case 'books':
                    const book_res = await search({ q: search_val }, { maxResults: 20, startIndex: (search_page - 1) * 20, orderBy: 'relevance', projection: 'full' })
                    book_res.items?.forEach(book => {
                        let iso_release;
                        if (book.volumeInfo?.publishedDate && !isNaN(new Date(book.volumeInfo?.publishedDate).getTime())) {
                            iso_release = new Date(book.volumeInfo?.publishedDate).toISOString();
                        } else {
                            iso_release = null;
                        }
                        search_results.push(
                            {
                                gbid: book.id,
                                title: book.volumeInfo?.title,
                                subtitle: book.volumeInfo?.subtitle,
                                author: book.volumeInfo?.authors?.join(', '),
                                release: iso_release,
                                image: book.volumeInfo?.imageLinks?.smallThumbnail,
                                pagecount: book.volumeInfo?.pageCount,
                                averagerating: book.volumeInfo?.averageRating,
                                genres: book.volumeInfo?.categories?.join(', ')
                            } as mediaObject
                        )
                    })
                    return new Response(JSON.stringify(search_results));
                default:
                    break;
            }
        } catch (error) {
            console.log(`Error on Endpoint getSearchSuggestions: ${error}`);
            // Retry after 50ms
            console.log(`Retrying in 1s..`);
            await delay(1000);
        }
        try_count++;
    }
    return new Response(`No success fetching search suggestions after ${RETRIES} retries`);
}
