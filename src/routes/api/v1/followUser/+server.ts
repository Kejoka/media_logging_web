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
			res = await supabase
				.from('following')
				.delete()
				.eq('follower', session?.user.id)
				.eq('followee', followee_id_res.data.id);

			// Get and delete the follow notification when unfollowing
			const notificationToDelete = await supabase
				.from('user_activities')
				.select('id, details')
				.eq('user_id', session?.user.id)
				.eq('activity_type', 'follow');
			
			if (notificationToDelete.data && notificationToDelete.data.length > 0) {
				// Filter to find the specific follow notification for this followee
				const specificNotificationIds = notificationToDelete.data
					.filter((n: any) => String(n.details?.followee_id) === String(followee_id_res.data.id))
					.map((n: any) => n.id);
				
				if (specificNotificationIds.length > 0) {
					await supabase
						.from('user_activities')
						.delete()
						.in('id', specificNotificationIds);
				}
			}

			return new Response(
				JSON.stringify({
					result: res,
					message: `Unfollowed user ${followee}`,
					type: 'unfollow'
				})
			);
		} else {
			res = await supabase.from('following').upsert({
				follower: session?.user.id,
				followee: followee_id_res.data.id
			});

			// Create a notification for the user being followed
			const notificationRes = await supabase.from('user_activities').insert({
				user_id: session?.user.id,
				activity_type: 'follow',
				media_type: null,
				details: { followee_id: followee_id_res.data.id }
			});

			if (notificationRes.error) {
				console.error('Error creating follow notification:', notificationRes.error);
			}

			return new Response(
				JSON.stringify({
					result: res,
					message: `Followed user ${followee}`,
					type: 'follow'
				})
			);
		}
	} catch (error) {
		console.log(`Error on Endpoint followUser: \n ${error}`);
		return new Response(String(error));
	}
}
