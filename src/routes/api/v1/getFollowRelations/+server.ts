/** @type {import('./$types').RequestHandler} */
export async function POST({ locals: { supabase, safeGetSession } }) {
	const { session } = await safeGetSession();
	if (!session) {
		return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
	}

	try {
		const [{ data: followingRows, error: followingError }, { data: followerRows, error: followerError }] =
			await Promise.all([
				supabase.from('following').select('followee').eq('follower', session.user.id),
				supabase.from('following').select('follower').eq('followee', session.user.id)
			]);

		if (followingError) throw followingError;
		if (followerError) throw followerError;

		const followingIds = (followingRows || []).map((row) => row.followee);
		const followerIds = (followerRows || []).map((row) => row.follower);
		const profileIds = [...new Set([...followingIds, ...followerIds])];

		const { data: profileRows, error: profileError } =
			profileIds.length > 0
				? await supabase.from('profiles').select('id, username').in('id', profileIds)
				: { data: [], error: null };

		if (profileError) throw profileError;

		const profileMap = new Map((profileRows || []).map((profile) => [profile.id, profile.username]));
		const followingSet = new Set(followingIds.map((id) => String(id)));

		const following = followingIds
			.map((id) => ({
				username: profileMap.get(id),
				isFollowing: true
			}))
			.filter((item) => typeof item.username === 'string') as { username: string; isFollowing: boolean }[];

		const followers = followerIds
			.map((id) => ({
				username: profileMap.get(id),
				isFollowing: followingSet.has(String(id))
			}))
			.filter((item) => typeof item.username === 'string') as { username: string; isFollowing: boolean }[];

		following.sort((a, b) => a.username.localeCompare(b.username));
		followers.sort((a, b) => a.username.localeCompare(b.username));

		return new Response(
			JSON.stringify({
				following,
				followers
			}),
			{
				headers: {
					'Content-Type': 'application/json'
				}
			}
		);
	} catch (error) {
		console.error('Error fetching follow relations:', error);
		return new Response(JSON.stringify({ error: 'Failed to fetch follow relations' }), {
			status: 500,
			headers: {
				'Content-Type': 'application/json'
			}
		});
	}
}