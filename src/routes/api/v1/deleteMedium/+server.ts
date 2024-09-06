/** @type {import('./$types').RequestHandler} */
export async function POST({ request, locals: { supabase, safeGetSession } }) {
    const req_body = await request.json();
    const current_medium = req_body['current_medium'];
    const medium_id = req_body['medium_id'];
    const sync_timestamp = req_body['sync_timestamp'];
    const { session } = await safeGetSession();
    try {
        let error = await supabase.from('profiles').upsert({
            id: session?.user.id,
            updated_at: sync_timestamp
        });
        error = await supabase.from(current_medium).delete().eq('id', medium_id)
        return new Response(JSON.stringify(error));
    } catch (error) {
        console.log(`Error on Endpoint deleteMedium: \n ${error}`);
        return new Response(String(error));
    }
}
