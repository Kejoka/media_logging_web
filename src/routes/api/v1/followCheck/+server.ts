/** @type {import('./$types').RequestHandler} */
export async function POST({ request, locals: { supabase, safeGetSession } }) {
	const req_body = (await request.json()) as Record<string, any>;
	const followee = req_body['followee'];
	const { session } = await safeGetSession();
	let res;
	try {
		const followee_id_res = await supabase
			.from('profiles')
			.select('id')
			.eq('username', followee)
			.single();
		if (followee_id_res.error || !followee_id_res.data) {
			throw new Error(`Could not find user with username ${followee}`);
		}
		const already_following_res = await supabase
			.from('following')
			.select('*')
			.eq('follower', session?.user.id)
			.eq('followee', followee_id_res.data.id)
			.single();
		if (already_following_res.data) {
			return new Response(
				JSON.stringify({
					following: true
				})
			);
		} else {
			return new Response(
				JSON.stringify({
					following: false
				})
			);
		}
	} catch (error) {
		console.log(`Error on Endpoint followCheck: \n ${error}`);
		return new Response(String(error));
	}
}
