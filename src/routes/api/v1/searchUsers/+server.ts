import { supabase } from '$lib/supabaseClient.js';
import { delay } from '$lib/utils.js';



const RETRIES: number = 3;

/** @type {import('./$types').RequestHandler} */
export async function POST({ request }) {
	const req_body = await request.json();
	const search_val = req_body['search_val'];

	let try_count = 0;
	while (try_count < RETRIES) {
		try {
			const res = await supabase.from('profiles').select('username').ilike('username', `%${search_val}%`)
			return new Response(JSON.stringify(res.data?.map(x => x.username)));
		} catch (error) {
			console.log(`Error on Endpoint searchUsers: ${error}`);
			// Retry after 50ms
			console.log(`Retrying in 1s..`);
			await delay(1000);
		}
		try_count++;
	}
	return new Response(`No success fetching search suggestions after ${RETRIES} retries`);
}
