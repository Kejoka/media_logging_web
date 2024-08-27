import { delay } from '$lib/utils.js';

const RETRIES: number = 3;

/** @type {import('./$types').RequestHandler} */
export async function POST({ request, locals: { supabase, safeGetSession } }) {
    const reqBody = await request.json();
    const new_value = reqBody['new_value'];
    const update_id = reqBody['id'];
    const { session } = await safeGetSession();
    let try_count = 0;
    while (try_count < RETRIES) {
        try {
            const error = await supabase.from('profiles').upsert({
                id: session?.user.id,
                updated_at: new Date()
            });
            const res = await supabase.from('shows').update({ episode: new_value }).eq('id', update_id);
            return new Response(JSON.stringify(res));
        } catch (error) {
            console.log(`Error on Endpoint updateEpisode: ${error}`);
            // Retry after 500ms
            console.log(`Retrying in 500ms..`);
            await delay(500);
        }
        try_count++;
    }
    return new Response(`No success updating episode after ${RETRIES} retries`);
}
