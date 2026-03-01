/** @type {import('./$types').RequestHandler} */
export async function POST({ request, locals: { supabase, safeGetSession } }) {
	const { session } = await safeGetSession();
	if (!session) {
		return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
	}

	try {
		const now = new Date().toISOString();

		// Upsert the last read timestamp
		const { error } = await supabase.from('notification_read_status').upsert(
			{
				user_id: session.user.id,
				last_read_at: now
			},
			{
				onConflict: 'user_id'
			}
		);

		if (error) throw error;

		return new Response(
			JSON.stringify({
				success: true,
				last_read_at: now
			})
		);
	} catch (error) {
		console.error('Error marking notifications as read:', error);
		return new Response(JSON.stringify({ error: 'Failed to mark notifications as read' }), {
			status: 500
		});
	}
}
