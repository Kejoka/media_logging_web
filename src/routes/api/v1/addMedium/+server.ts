import { supabase } from '$lib/supabaseClient.js';

/** @type {import('./$types').RequestHandler} */
export async function POST({ request }) {
    const reqBody = await request.json();
    const current_medium = reqBody['current_medium'];
    const user_id = reqBody['user_id'];
    const medium = reqBody['last_selection'];
    console.log(current_medium, user_id, medium)

    let error;
    try {
        switch (current_medium) {
            case 'games':
                error = await supabase.from(current_medium).insert({
                    user_id: user_id,
                    igdbid: medium.igdbid,
                    title: medium.title,
                    image: medium.image,
                    release: medium.release,
                    genres: medium.genres,
                    platforms: medium.platforms,
                    averagerating: Number(medium.averagerating / 10).toFixed(1),
                    rating: 0,
                    backlogged: medium.backlogged || 0,
                    added: medium.added,
                    trophy: 0
                })
                return new Response(JSON.stringify(error));
            case 'movies':
                error = await supabase.from(current_medium).insert({
                    user_id: user_id,
                    tmdbid: medium.tmdbid,
                    title: medium.title,
                    image: medium.image,
                    release: medium.release,
                    genres: medium.genres,
                    averagerating: medium.averagerating.toFixed(1),
                    rating: 0,
                    backlogged: medium.backlogged || 0,
                    added: medium.added
                })
                return new Response(JSON.stringify(error));
            case 'shows':
                error = await supabase.from(current_medium).insert({
                    user_id: user_id,
                    tmdbid: medium.tmdbid,
                    title: medium.title,
                    image: medium.image,
                    release: medium.release,
                    genres: medium.genres,
                    averagerating: medium.averagerating.toFixed(1),
                    rating: 0,
                    backlogged: medium.backlogged || 0,
                    added: medium.added
                })
                return new Response(JSON.stringify(error));
            case 'books':
                error = await supabase.from(current_medium).insert({
                    user_id: user_id,
                    gbid: medium.gbid,
                    title: medium.title,
                    subtitle: medium.subtitle,
                    author: medium.author,
                    image: medium.image,
                    release: medium.release,
                    genres: medium.genres,
                    pagecount: medium.pagecount,
                    averagerating: Number(medium.averagerating * 2).toFixed(1),
                    rating: 0,
                    backlogged: medium.backlogged || 0,
                    added: medium.added
                })
                return new Response(JSON.stringify(error));
            default:
                throw 'Switch Statement failed'
        }
    } catch (error) {
        console.log(`Error on Endpoint addMedium: \n ${error}`);
        return new Response(String(error));
    }
}
