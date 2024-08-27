/** @type {import('./$types').RequestHandler} */
export async function POST({ request, locals: { supabase, safeGetSession } }) {
    const reqBody = await request.json();
    const current_medium = reqBody['current_medium'];
    const toEdit = reqBody['toEdit'];
    const { session } = await safeGetSession();
    console.log(toEdit)
    let error;
    try {
        error = await supabase.from('profiles').upsert({
            id: session?.user.id,
            updated_at: new Date()
        });
        switch (current_medium) {
            case 'games':
                error = await supabase.from(current_medium).update({
                    title: toEdit.title.trim().length > 0 ? toEdit.title.trim() : 'Kein Titel angegeben',
                    image: toEdit.image && toEdit.image.trim().length > 0 ? toEdit.image.trim() : null,
                    release: toEdit.release && toEdit.release.trim().length > 0 ? toEdit.release.trim() : null,
                    genres: toEdit.genres && toEdit.genres.trim().length > 0 ? toEdit.genres.trim() : null,
                    platforms: toEdit.platforms && toEdit.platforms.trim().length > 0 ? toEdit.platforms.trim() : null,
                    added: toEdit.added && toEdit.added.trim().length > 0 ? toEdit.added.trim() : new Date().toISOString(),
                    notes: toEdit.notes && toEdit.notes.trim().length > 0 ? toEdit.notes.trim() : null
                }).eq('id', toEdit.id)
                return new Response(JSON.stringify(error));
            case 'movies':
                error = await supabase.from(current_medium).update({
                    title: toEdit.title && toEdit.title.trim().length > 0 ? toEdit.title.trim() : 'Kein Titel angegeben',
                    image: toEdit.image && toEdit.image.trim().length > 0 ? toEdit.image.trim() : null,
                    release: toEdit.release && toEdit.release.trim().length > 0 ? toEdit.release.trim() : null,
                    genres: toEdit.genres && toEdit.genres.trim().length > 0 ? toEdit.genres.trim() : null,
                    added: toEdit.added && toEdit.added.trim().length > 0 ? toEdit.added.trim() : new Date().toISOString(),
                    notes: toEdit.notes && toEdit.notes.trim().length > 0 ? toEdit.notes.trim() : null
                }).eq('id', toEdit.id)
                return new Response(JSON.stringify(error));
            case 'shows':
                error = await supabase.from(current_medium).update({
                    title: toEdit.title && toEdit.title.trim().length > 0 ? toEdit.title : 'Kein Titel angegeben',
                    image: toEdit.image && toEdit.image.trim().length > 0 ? toEdit.image : null,
                    release: toEdit.release && toEdit.release.trim().length > 0 ? toEdit.release : null,
                    genres: toEdit.genres && toEdit.genres.trim().length > 0 ? toEdit.genres : null,
                    added: toEdit.added && toEdit.added.trim().length > 0 ? toEdit.added : new Date().toISOString(),
                    notes: toEdit.notes && toEdit.notes.trim().length > 0 ? toEdit.notes : null,
                    seasons: toEdit.seasons && toEdit.seasons.trim().length > 0 ? toEdit.seasons : null,
                    episode: toEdit.episode && toEdit.episode.toString().trim().length > 0 ? toEdit.episode : 0
                }).eq('id', toEdit.id)
                return new Response(JSON.stringify(error));
            case 'books':
                error = await supabase.from(current_medium).update({
                    title: toEdit.title && toEdit.title.trim().length > 0 ? toEdit.title : 'Kein Titel angegeben',
                    author: toEdit.author && toEdit.author.trim().length > 0 ? toEdit.author : null,
                    image: toEdit.image && toEdit.image.trim().length > 0 ? toEdit.image : null,
                    release: toEdit.release && toEdit.release.trim().length > 0 ? toEdit.release : null,
                    genres: toEdit.genres && toEdit.genres.trim().length > 0 ? toEdit.genres : null,
                    pagecount: toEdit.pagecount && toEdit.pagecount.toString().trim().length > 0 ? toEdit.pagecount : null,
                    added: toEdit.added && toEdit.added.trim().length > 0 ? toEdit.added : new Date().toISOString(),
                    notes: toEdit.notes && toEdit.notes.trim().length > 0 ? toEdit.notes : null
                }).eq('id', toEdit.id)
                return new Response(JSON.stringify(error));
            default:
                throw 'Switch Statement failed'
        }
    } catch (error) {
        console.log(`Error on Endpoint updateMedium: \n ${error}`);
        return new Response(String(error));
    }
}
