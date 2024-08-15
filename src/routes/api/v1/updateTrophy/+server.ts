import { supabase } from '$lib/supabaseClient.js';
import { delay } from '$lib/utils.js';

const RETRIES: number = 3;

/** @type {import('./$types').RequestHandler} */
export async function POST({ request }) {
	const reqBody = await request.json();
	const new_value = reqBody['new_value'];
	const update_id = reqBody['id'];

	let try_count = 0;
	while (try_count < RETRIES) {
		try {
			const res = await supabase.from('games').update({ trophy: new_value }).eq('id', update_id);
			console.log(res)
			return new Response(JSON.stringify(res));
		} catch (error) {
			console.log(`Error on Endpoint updateTrophy: ${error}`);
			// Retry after 50ms
			console.log(`Retrying in 50ms..`);
			await delay(50);
		}
		try_count++;
	}
	return new Response(`No success updating trophy after ${RETRIES} retries`);
}
