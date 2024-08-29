/** @type {import('./$types').RequestHandler} */
export async function POST({ request, locals: { supabase, safeGetSession } }) {
    const reqBody = await request.json();
    const current_medium = reqBody['current_medium'];
    const medium_id = reqBody['medium_id'];
    const syncTimestamp = reqBody['syncTimestamp'];
    const { session } = await safeGetSession();
    try {
        let error = await supabase.from('profiles').upsert({
            id: session?.user.id,
            updated_at: syncTimestamp
        });
        error = await supabase.from(current_medium).delete().eq('id', medium_id)
        return new Response(JSON.stringify(error));
    } catch (error) {
        console.log(`Error on Endpoint deleteMedium: \n ${error}`);
        return new Response(String(error));
    }
}
