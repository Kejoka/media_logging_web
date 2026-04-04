/** @type {import('./$types').RequestHandler} */
export async function POST({ request, locals: { supabase, safeGetSession } }) {
	const { session } = await safeGetSession();
	if (!session) {
		return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
	}

	try {
		// Get the list of users the current user is following
		const { data: following, error: followingError } = await supabase
			.from('following')
			.select('followee')
			.eq('follower', session.user.id);

		if (followingError) throw followingError;

		const followedUserIds = (following || []).map((f) => f.followee);

		// Get the user's last read timestamp
		const { data: readStatus } = await supabase
			.from('notification_read_status')
			.select('last_read_at')
			.eq('user_id', session.user.id)
			.single();

		const lastReadAt = readStatus?.last_read_at || new Date(0).toISOString();

		// Get activities from followed users in the last 14 days
		const fourteenDaysAgo = new Date();
		fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

		const baseActivitySelect = `
			id,
			user_id,
			activity_type,
			media_type,
			media_title,
			details,
			created_at
		`;

		const followedActivitiesPromise =
			followedUserIds.length > 0
				? supabase
						.from('user_activities')
						.select(baseActivitySelect)
						.in('user_id', followedUserIds)
						.in('activity_type', ['add', 'update', 'delete'])
						.gte('created_at', fourteenDaysAgo.toISOString())
						.order('created_at', { ascending: false })
						.limit(100)
				: Promise.resolve({ data: [], error: null });

		// Get follow notifications where the current user is the followee
		const [
			followedActivitiesRes,
			followActivitiesRes,
			recommendationActivitiesRes,
			recommendationResponsesRes
		] = await Promise.all([
			followedActivitiesPromise,
			supabase
				.from('user_activities')
				.select(baseActivitySelect)
				.eq('activity_type', 'follow')
				.gte('created_at', fourteenDaysAgo.toISOString())
				.order('created_at', { ascending: false }),
			supabase
				.from('user_activities')
				.select(baseActivitySelect)
				.eq('activity_type', 'recommendation')
				.order('created_at', { ascending: false })
				.limit(200),
			supabase
				.from('user_activities')
				.select(baseActivitySelect)
				.eq('activity_type', 'recommendation_response')
				.gte('created_at', fourteenDaysAgo.toISOString())
				.order('created_at', { ascending: false })
				.limit(200)
		]);

		if (followedActivitiesRes.error) throw followedActivitiesRes.error;
		if (followActivitiesRes.error) throw followActivitiesRes.error;
		if (recommendationActivitiesRes.error) throw recommendationActivitiesRes.error;
		if (recommendationResponsesRes.error) throw recommendationResponsesRes.error;

		const activities = followedActivitiesRes.data || [];
		const followActivities = followActivitiesRes.data || [];
		const recommendationActivities = recommendationActivitiesRes.data || [];
		const recommendationResponses = recommendationResponsesRes.data || [];

		// Filter follow activities to only those where current user is the followee
		const relevantFollowActivities = (followActivities || []).filter((activity) => {
			const followeeId = activity.details?.followee_id;
			return String(followeeId) === String(session.user.id);
		});

		const incomingRecommendations = (recommendationActivities || []).filter((activity) => {
			const recipientId = activity.details?.recipient_id;
			return String(recipientId) === String(session.user.id);
		});

		const senderResponses = (recommendationResponses || []).filter((activity) => {
			const senderId = activity.details?.sender_id;
			return String(senderId) === String(session.user.id);
		});

		// Combine both activity types and deduplicate by ID
		const activityIds = new Set((activities || []).map((a) => a.id));
		const uniqueFollowActivities = relevantFollowActivities.filter((a) => !activityIds.has(a.id));
		const uniqueIncomingRecommendations = incomingRecommendations.filter((a) => !activityIds.has(a.id));
		const uniqueSenderResponses = senderResponses.filter((a) => !activityIds.has(a.id));
		const allActivities = [
			...(activities || []),
			...uniqueFollowActivities,
			...uniqueIncomingRecommendations,
			...uniqueSenderResponses
		];

		// Get user's dismissed activities
		const { data: dismissedActivities, error: dismissedError } = await supabase
			.from('dismissed_activities')
			.select('activity_id')
			.eq('user_id', session.user.id);

		if (dismissedError) throw dismissedError;

		const dismissedActivityIds = new Set(
			(dismissedActivities || []).map((d) => d.activity_id)
		);

		// Filter out dismissed activities
		const visibleActivities = allActivities.filter((a) => !dismissedActivityIds.has(a.id));

		// Sort combined activities by date
		visibleActivities.sort(
			(a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
		);

		// Get usernames for all activities
		const userIds = [...new Set(visibleActivities.map((a) => a.user_id))];
		const { data: profiles } = await supabase
			.from('profiles')
			.select('id, username')
			.in('id', userIds);

		const usernameMap = new Map(profiles?.map((p) => [p.id, p.username]) || []);

		// Enrich activities with username and format them
		const enrichedActivities = visibleActivities.map((activity) => ({
			...activity,
			username: usernameMap.get(activity.user_id) || 'Unknown User',
			isUnread: new Date(activity.created_at) > new Date(lastReadAt)
		}));

		// Count unread notifications
		const unreadCount = enrichedActivities.filter((a) => a.isUnread).length;

		// Format activities (no grouping - show each individually)
		const formattedActivities = formatActivities(enrichedActivities);

		return new Response(
			JSON.stringify({
				notifications: formattedActivities,
				unreadCount
			})
		);
	} catch (error) {
		console.error('Error fetching notifications:', error);
		return new Response(JSON.stringify({ error: 'Failed to fetch notifications' }), {
			status: 500
		});
	}
}

// Helper function to format activities - no grouping, show each individually
function formatActivities(activities: any[]) {
	const formatted: any[] = [];

	activities.forEach((activity) => {
		// Add unique ID prefix based on activity type
		formatted.push({
			...activity,
			id: `activity_${activity.id}`
		});
	});

	// Sort: follow activities first, then by date
	return formatted.sort((a, b) => {
		// Prioritize follow activities
		if (a.activity_type === 'follow' && b.activity_type !== 'follow') return -1;
		if (a.activity_type !== 'follow' && b.activity_type === 'follow') return 1;
		if (a.activity_type === 'recommendation' && b.activity_type !== 'recommendation') return -1;
		if (a.activity_type !== 'recommendation' && b.activity_type === 'recommendation') return 1;
		// Within same type, sort by date (newest first)
		return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
	});
}
