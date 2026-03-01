/** @type {import('./$types').RequestHandler} */
export async function POST({ request, locals: { supabase, safeGetSession } }) {
	const req_body = (await request.json()) as {
		activity_type: 'add' | 'update' | 'delete';
		media_type: 'games' | 'movies' | 'shows' | 'books';
		media_title?: string;
		details?: any;
	};

	const { session } = await safeGetSession();
	if (!session) {
		return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
	}

	try {
		const { error } = await supabase.from('user_activities').insert({
			user_id: session.user.id,
			activity_type: req_body.activity_type,
			media_type: req_body.media_type,
			media_title: req_body.media_title,
			details: req_body.details || {}
		});

		if (error) throw error;

		return new Response(JSON.stringify({ success: true }));
	} catch (error) {
		console.error('Error logging activity:', error);
		return new Response(JSON.stringify({ error: 'Failed to log activity' }), { status: 500 });
	}
}
