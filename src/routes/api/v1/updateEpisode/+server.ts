import { delay } from '$lib/utils.js';

const RETRIES: number = 3;

/** @type {import('./$types').RequestHandler} */
export async function POST({ request, locals: { supabase, safeGetSession } }) {
	const request_body = (await request.json()) as { new_value: any; id: any; sync_timestamp: any };
	const new_value = request_body.new_value;
	const update_id = request_body.id;
	const sync_timestamp = request_body.sync_timestamp;
	const { session } = await safeGetSession();
	if (!session) {
		return new Response('Unauthorized', { status: 401 });
	}
	let try_count = 0;
	while (try_count < RETRIES) {
		try {
			const profileResult = await supabase.from('profiles').upsert({
				id: session.user.id,
				updated_at: sync_timestamp
			});
			if (profileResult.error) {
				throw profileResult.error;
			}
			const update_response = await supabase
				.from('shows')
				.update({ episode: new_value })
				.eq('id', update_id);
			if (update_response.error) {
				throw update_response.error;
			}
			return new Response(JSON.stringify(update_response));
		} catch (error) {
			console.log(`Error on Endpoint updateEpisode: ${error}`);
			// Retry after 500ms
			console.log(`Retrying in 500ms..`);
			await delay(500);
		}
		try_count++;
	}
	return new Response(`No success updating episode after ${RETRIES} retries`, { status: 500 });
}
