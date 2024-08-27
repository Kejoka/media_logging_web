import { delay } from '$lib/utils.js';

const RETRIES: number = 3;

/** @type {import('./$types').RequestHandler} */
export async function POST({ request, locals: { supabase, safeGetSession } }) {
	const reqBody = await request.json();
	const new_score = reqBody['score'];
	const current_medium = reqBody['current_medium'];
	const update_id = reqBody['medium']['id'];
	const { session } = await safeGetSession();

	let try_count = 0;
	while (try_count < RETRIES) {
		try {
			const error = await supabase.from('profiles').upsert({
				id: session?.user.id,
				updated_at: new Date()
			});
			const res = await supabase.from(current_medium).update({ rating: new_score }).eq('id', update_id);
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
