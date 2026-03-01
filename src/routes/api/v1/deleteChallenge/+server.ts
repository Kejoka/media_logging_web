/** @type {import('./$types').RequestHandler} */
export async function POST({ request, locals: { supabase, safeGetSession } }) {
	const { session } = await safeGetSession();
	if (!session) {
		return new Response('Unauthorized', { status: 401 });
	}

	const reqBody = (await request.json()) as {
		medium: string;
		year: number;
		challenge_type: string;
	};

	const medium = reqBody.medium;
	const year = Number(reqBody.year);
	const challenge_type = String(reqBody.challenge_type || '').trim();

	if (!medium || Number.isNaN(year) || !['count', 'pages', 'completion'].includes(challenge_type)) {
		return new Response('Invalid payload', { status: 400 });
	}

	const deleteResult = await supabase
		.from('user_challenges')
		.delete()
		.eq('user_id', session.user.id)
		.eq('medium', medium)
		.eq('year', year)
		.eq('challenge_type', challenge_type);

	if (deleteResult.error) {
		return new Response(deleteResult.error.message, { status: 500 });
	}

	return new Response(JSON.stringify({ success: true }), {
		headers: {
			'Content-Type': 'application/json'
		}
	});
}
