/** @type {import('./$types').RequestHandler} */
export async function POST({ request, locals: { supabase, safeGetSession } }) {
	const { session } = await safeGetSession();
	if (!session) {
		return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
	}

	const { notificationId } = (await request.json()) as { notificationId?: string | number };

	if (!notificationId) {
		return new Response(JSON.stringify({ error: 'notificationId is required' }), { status: 400 });
	}

	try {
		// Extract actual ID from prefixed notification ID
		// Format can be: activity_123, follow_123, or group_123
		const actualId = parseInt(notificationId.toString().replace(/^(activity_|follow_|group_)/, ''));

		if (isNaN(actualId)) {
			return new Response(JSON.stringify({ error: 'Invalid notificationId format' }), {
				status: 400
			});
		}

		// Insert into dismissed_activities table
		// This marks this activity as dismissed for the current user
		const { data, error } = await supabase
			.from('dismissed_activities')
			.insert([
				{
					user_id: session.user.id,
					activity_id: actualId
				}
			])
			.select()
			.single();

		if (error) {
			// If it's a unique constraint violation, it's already dismissed - return success
			if (error.code === '23505') {
				return new Response(
					JSON.stringify({
						success: true,
						message: 'Activity already dismissed'
					})
				);
			}
			throw error;
		}

		return new Response(
			JSON.stringify({
				success: true,
				dismissed_at: data.dismissed_at
			})
		);
	} catch (error) {
		console.error('Error dismissing notification:', error);
		return new Response(JSON.stringify({ error: 'Failed to dismiss notification' }), {
			status: 500
		});
	}
}
