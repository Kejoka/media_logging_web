/** @type {import('./$types').RequestHandler} */
export async function POST({ request, locals: { supabase, safeGetSession } }) {
    const req_body = await request.json();
    const current_medium = req_body['current_medium'];
    const to_edit = req_body['to_edit'];
    const sync_timestamp = req_body['sync_timestamp'];
    const { session } = await safeGetSession();
    let error;
    try {
        error = await supabase.from('profiles').upsert({
            id: session?.user.id,
            updated_at: sync_timestamp
        });
        switch (current_medium) {
            case 'games':
                error = await supabase.from(current_medium).update({
                    title: to_edit.title.trim().length > 0 ? to_edit.title.trim() : 'Kein Titel angegeben',
                    image: to_edit.image && to_edit.image.trim().length > 0 ? to_edit.image.trim() : null,
                    release: to_edit.release && to_edit.release.trim().length > 0 ? to_edit.release.trim() : null,
                    genres: to_edit.genres && to_edit.genres.trim().length > 0 ? to_edit.genres.trim() : null,
                    platforms: to_edit.platforms && to_edit.platforms.trim().length > 0 ? to_edit.platforms.trim() : null,
                    added: to_edit.added && to_edit.added.trim().length > 0 ? to_edit.added.trim() : new Date().toISOString(),
                    notes: to_edit.notes && to_edit.notes.trim().length > 0 ? to_edit.notes.trim() : null
                }).eq('id', to_edit.id)
                return new Response(JSON.stringify(error));
            case 'movies':
                error = await supabase.from(current_medium).update({
                    title: to_edit.title && to_edit.title.trim().length > 0 ? to_edit.title.trim() : 'Kein Titel angegeben',
                    image: to_edit.image && to_edit.image.trim().length > 0 ? to_edit.image.trim() : null,
                    release: to_edit.release && to_edit.release.trim().length > 0 ? to_edit.release.trim() : null,
                    genres: to_edit.genres && to_edit.genres.trim().length > 0 ? to_edit.genres.trim() : null,
                    added: to_edit.added && to_edit.added.trim().length > 0 ? to_edit.added.trim() : new Date().toISOString(),
                    notes: to_edit.notes && to_edit.notes.trim().length > 0 ? to_edit.notes.trim() : null
                }).eq('id', to_edit.id)
                return new Response(JSON.stringify(error));
            case 'shows':
                error = await supabase.from(current_medium).update({
                    title: to_edit.title && to_edit.title.trim().length > 0 ? to_edit.title : 'Kein Titel angegeben',
                    image: to_edit.image && to_edit.image.trim().length > 0 ? to_edit.image : null,
                    release: to_edit.release && to_edit.release.trim().length > 0 ? to_edit.release : null,
                    genres: to_edit.genres && to_edit.genres.trim().length > 0 ? to_edit.genres : null,
                    added: to_edit.added && to_edit.added.trim().length > 0 ? to_edit.added : new Date().toISOString(),
                    notes: to_edit.notes && to_edit.notes.trim().length > 0 ? to_edit.notes : null,
                    seasons: to_edit.seasons && to_edit.seasons.trim().length > 0 ? to_edit.seasons : null,
                    episode: to_edit.episode && to_edit.episode.toString().trim().length > 0 ? to_edit.episode : 0
                }).eq('id', to_edit.id)
                return new Response(JSON.stringify(error));
            case 'books':
                error = await supabase.from(current_medium).update({
                    title: to_edit.title && to_edit.title.trim().length > 0 ? to_edit.title : 'Kein Titel angegeben',
                    author: to_edit.author && to_edit.author.trim().length > 0 ? to_edit.author : null,
                    image: to_edit.image && to_edit.image.trim().length > 0 ? to_edit.image : null,
                    release: to_edit.release && to_edit.release.trim().length > 0 ? to_edit.release : null,
                    genres: to_edit.genres && to_edit.genres.trim().length > 0 ? to_edit.genres : null,
                    pagecount: to_edit.pagecount && to_edit.pagecount.toString().trim().length > 0 ? to_edit.pagecount : null,
                    added: to_edit.added && to_edit.added.trim().length > 0 ? to_edit.added : new Date().toISOString(),
                    notes: to_edit.notes && to_edit.notes.trim().length > 0 ? to_edit.notes : null
                }).eq('id', to_edit.id)
                return new Response(JSON.stringify(error));
            default:
                throw 'Switch Statement failed'
        }
    } catch (error) {
        console.log(`Error on Endpoint updateMedium: \n ${error}`);
        return new Response(String(error));
    }
}
