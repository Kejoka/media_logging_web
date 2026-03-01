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
		label: string;
		target_count: number;
	};

	const medium = reqBody.medium;
	const year = Number(reqBody.year);
	const challenge_type = String(reqBody.challenge_type || '').trim();
	const label = String(reqBody.label || '').trim();
	const targetCount = Number(reqBody.target_count);

	if (
		!medium ||
		Number.isNaN(year) ||
		Number.isNaN(targetCount) ||
		targetCount <= 0 ||
		label.length === 0 ||
		!['count', 'pages', 'completion'].includes(challenge_type)
	) {
		return new Response('Invalid payload', { status: 400 });
	}

	const upsertResult = await supabase
		.from('user_challenges')
		.upsert(
			{
				user_id: session.user.id,
				medium,
				year,
				challenge_type,
				label,
				target_count: targetCount,
				updated_at: new Date().toISOString()
			},
			{ onConflict: 'user_id,medium,year,challenge_type' }
		)
		.select()
		.single();

	if (upsertResult.error) {
		return new Response(upsertResult.error.message, { status: 500 });
	}

	return new Response(JSON.stringify(upsertResult.data), {
		headers: {
			'Content-Type': 'application/json'
		}
	});
}
