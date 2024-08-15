import { supabase } from '$lib/supabaseClient.js';

/** @type {import('./$types').RequestHandler} */
export async function POST({ request }) {
    const reqBody = await request.json();
    const current_medium = reqBody['current_medium'];
    const medium_id = reqBody['medium_id'];

    try {
        const error = await supabase.from(current_medium).delete().eq('id', medium_id)
        return new Response(JSON.stringify(error));
    } catch (error) {
        console.log(`Error on Endpoint addMedium: \n ${error}`);
        return new Response(String(error));
    }
}
