/** @type {import('./$types').RequestHandler} */
export async function POST({ request, locals: { supabase, safeGetSession } }) {
    const req_body = await request.json();
    const current_medium = req_body['current_medium'];
    const medium = req_body['last_selection'];
    const sync_timestamp = req_body['sync_timestamp']
    const { session } = await safeGetSession();
    let error;
    try {
        error = await supabase.from('profiles').upsert({
            id: session?.user.id,
            updated_at: sync_timestamp
        });
        switch (current_medium) {
            case 'games':
                error = await supabase.from(current_medium).insert({
                    user_id: session?.user.id,
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
                    trophy: 0,
                    notes: medium.notes || ''
                }).select('id').single()
                return new Response(JSON.stringify(error));
            case 'movies':
                error = await supabase.from(current_medium).insert({
                    user_id: session?.user.id,
                    tmdbid: medium.tmdbid,
                    title: medium.title,
                    image: medium.image,
                    release: medium.release,
                    genres: medium.genres,
                    averagerating: medium.averagerating.toFixed(1),
                    rating: 0,
                    backlogged: medium.backlogged || 0,
                    added: medium.added,
                    notes: medium.notes || ''
                }).select('id').single()
                return new Response(JSON.stringify(error));
            case 'shows':
                error = await supabase.from(current_medium).insert({
                    user_id: session?.user.id,
                    tmdbid: medium.tmdbid,
                    title: medium.title,
                    image: medium.image,
                    release: medium.release,
                    genres: medium.genres,
                    averagerating: medium.averagerating.toFixed(1),
                    rating: 0,
                    backlogged: medium.backlogged || 0,
                    added: medium.added,
                    episode: 0,
                    notes: medium.notes || ''
                }).select('id').single()
                return new Response(JSON.stringify(error));
            case 'books':
                error = await supabase.from(current_medium).insert({
                    user_id: session?.user.id,
                    gbid: medium.gbid,
                    title: medium.title,
                    subtitle: medium.subtitle,
                    author: medium.author,
                    image: medium.image,
                    release: medium.release,
                    genres: medium.genres,
                    pagecount: medium.pagecount,
                    rating: 0,
                    backlogged: medium.backlogged || 0,
                    added: medium.added,
                    notes: medium.notes || ''
                }).select('id').single()
                return new Response(JSON.stringify(error));
            default:
                throw 'Switch Statement failed'
        }
    } catch (error) {
        console.log(`Error on Endpoint addMedium: \n ${error}`);
        return new Response(String(error));
    }
}
