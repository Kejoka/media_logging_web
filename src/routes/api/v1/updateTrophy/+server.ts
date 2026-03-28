import { delay } from '$lib/utils.js';

const RETRIES: number = 3;

/** @type {import('./$types').RequestHandler} */
export async function POST({ request, locals: { supabase, safeGetSession } }) {
	const request_body = (await request.json()) as { new_value: any; id: any; sync_timestamp: any };
	const new_value = request_body.new_value;
	const update_id = request_body.id;
	const sync_timestamp = request_body.sync_timestamp;
	const { session } = await safeGetSession();
	let try_count = 0;
	while (try_count < RETRIES) {
		try {
			const error = await supabase.from('profiles').upsert({
				id: session?.user.id,
				updated_at: sync_timestamp
			});
			const res = await supabase.from('games').update({ trophy: new_value }).eq('id', update_id);
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
