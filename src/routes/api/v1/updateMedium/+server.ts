import { supabase } from '$lib/supabaseClient.js';

/** @type {import('./$types').RequestHandler} */
export async function POST({ request }) {
    const reqBody = await request.json();
    const current_medium = reqBody['current_medium'];
    const toEdit = reqBody['toEdit'];
    console.log(toEdit)
    let error;
    try {
        switch (current_medium) {
            case 'games':
                error = await supabase.from(current_medium).update({
                    title: toEdit.title,
                    image: toEdit.image,
                    release: toEdit.release,
                    genres: toEdit.genres,
                    platforms: toEdit.platforms,
                    added: toEdit.added,
                    notes: toEdit.notes
                }).eq('id', toEdit.id)
                return new Response(JSON.stringify(error));
            case 'movies':
                error = await supabase.from(current_medium).update({
                    title: toEdit.title,
                    image: toEdit.image,
                    release: toEdit.release,
                    genres: toEdit.genres,
                    added: toEdit.added,
                    notes: toEdit.notes
                }).eq('id', toEdit.id)
                return new Response(JSON.stringify(error));
            case 'shows':
                error = await supabase.from(current_medium).update({
                    title: toEdit.title,
                    image: toEdit.image,
                    release: toEdit.release,
                    genres: toEdit.genres,
                    added: toEdit.added,
                    notes: toEdit.notes,
                    seasons: toEdit.seasons,
                    episode: toEdit.episode
                }).eq('id', toEdit.id)
                return new Response(JSON.stringify(error));
            case 'books':
                error = await supabase.from(current_medium).update({
                    title: toEdit.title,
                    author: toEdit.author,
                    image: toEdit.image,
                    release: toEdit.release,
                    genres: toEdit.genres,
                    pagecount: toEdit.pagecount,
                    added: toEdit.added,
                    notes: toEdit.notes
                }).eq('id', toEdit.id)
                return new Response(JSON.stringify(error));
            default:
                throw 'Switch Statement failed'
        }
    } catch (error) {
        console.log(`Error on Endpoint addMedium: \n ${error}`);
        return new Response(String(error));
    }
}
