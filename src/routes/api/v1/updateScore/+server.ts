import { delay } from '$lib/utils.js';

const RETRIES: number = 3;

/** @type {import('./$types').RequestHandler} */
export async function POST({ request, locals: { supabase, safeGetSession } }) {
	const request_body = (await request.json()) as {
		score: number;
		current_medium: string;
		medium: { id: number | string };
		sync_timestamp: string;
	};
	const new_score = request_body.score;
	const current_medium = request_body.current_medium;
	const update_id = request_body.medium.id;
	const sync_timestamp = request_body.sync_timestamp;
	const { session } = await safeGetSession();

	let try_count = 0;
	while (try_count < RETRIES) {
		try {
			const error = await supabase.from('profiles').upsert({
				id: session?.user.id,
				updated_at: sync_timestamp
			});
			const res = await supabase
				.from(current_medium)
				.update({ rating: new_score })
				.eq('id', update_id);
			return new Response(JSON.stringify(res));
		} catch (error) {
			console.log(`Error on Endpoint updateScore: ${error}`);
			// Retry after 500ms
			console.log(`Retrying in 500ms..`);
			await delay(500);
		}
		try_count++;
	}
	return new Response(`No success updating score after ${RETRIES} retries`);
}
