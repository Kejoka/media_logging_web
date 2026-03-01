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

		const followedUserIds = following.map((f) => f.followee);

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

		const { data: activities, error: activitiesError } = await supabase
			.from('user_activities')
			.select(
				`
				id,
				user_id,
				activity_type,
				media_type,
				media_title,
				details,
				created_at
			`
			)
			.in('user_id', followedUserIds)
			.gte('created_at', fourteenDaysAgo.toISOString())
			.order('created_at', { ascending: false })
			.limit(100);

		if (activitiesError) throw activitiesError;

		// Get follow notifications where the current user is the followee
		const { data: followActivities, error: followError } = await supabase
			.from('user_activities')
			.select(
				`
				id,
				user_id,
				activity_type,
				media_type,
				media_title,
				details,
				created_at
			`
			)
			.eq('activity_type', 'follow')
			.gte('created_at', fourteenDaysAgo.toISOString())
			.order('created_at', { ascending: false });

		if (followError) throw followError;

		// Filter follow activities to only those where current user is the followee
		const relevantFollowActivities = (followActivities || []).filter((activity) => {
			const followeeId = activity.details?.followee_id;
			return String(followeeId) === String(session.user.id);
		});

		// Combine both activity types and deduplicate by ID
		const activityIds = new Set((activities || []).map((a) => a.id));
		const uniqueFollowActivities = relevantFollowActivities.filter((a) => !activityIds.has(a.id));
		const allActivities = [...(activities || []), ...uniqueFollowActivities];

		// Sort combined activities by date
		allActivities.sort(
			(a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
		);

		// Get usernames for all activities
		const userIds = [...new Set(allActivities.map((a) => a.user_id))];
		const { data: profiles } = await supabase
			.from('profiles')
			.select('id, username')
			.in('id', userIds);

		const usernameMap = new Map(profiles?.map((p) => [p.id, p.username]) || []);

		// Enrich activities with username and format them
		const enrichedActivities = allActivities.map((activity) => ({
			...activity,
			username: usernameMap.get(activity.user_id) || 'Unknown User',
			isUnread: new Date(activity.created_at) > new Date(lastReadAt)
		}));

		// Count unread notifications
		const unreadCount = enrichedActivities.filter((a) => a.isUnread).length;

		// Group activities by user for better presentation
		const groupedActivities = groupActivitiesByUser(enrichedActivities);

		return new Response(
			JSON.stringify({
				notifications: groupedActivities,
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

// Helper function to group activities by user and time
function groupActivitiesByUser(activities: any[]) {
	const grouped: any[] = [];
	const userGroups = new Map();

	activities.forEach((activity) => {
		// Don't group follow activities - add unique ID prefix
		if (activity.activity_type === 'follow') {
			grouped.push({
				...activity,
				id: `follow_${activity.id}`
			});
			return;
		}

		const key = `${activity.user_id}_${activity.media_type}`;
		if (!userGroups.has(key)) {
			userGroups.set(key, []);
		}
		userGroups.get(key).push(activity);
	});

	userGroups.forEach((userActivities) => {
		// Group activities within short time windows (e.g., 1 hour)
		const timeGroups = [];
		let currentGroup: any[] = [];
		let lastTime: Date | null = null;

		userActivities.forEach((activity: any) => {
			const activityTime = new Date(activity.created_at);
			if (lastTime && Math.abs(activityTime.getTime() - lastTime.getTime()) < 60 * 60 * 1000) {
				// Within 1 hour
				currentGroup.push(activity);
			} else {
				if (currentGroup.length > 0) {
					timeGroups.push(currentGroup);
				}
				currentGroup = [activity];
				lastTime = activityTime;
			}
		});

		if (currentGroup.length > 0) {
			timeGroups.push(currentGroup);
		}

		// Create grouped notifications
		timeGroups.forEach((group) => {
			if (group.length > 1 && group.every((a: any) => a.activity_type === 'add')) {
				// Group multiple adds
				grouped.push({
					id: `group_${group[0].id}`,
					username: group[0].username,
					activity_type: 'bulk_add',
					media_type: group[0].media_type,
					count: group.length,
					created_at: group[0].created_at,
					isUnread: group.some((a: any) => a.isUnread),
					items: group
				});
			} else {
				// Keep individual activities with unique ID prefix
				grouped.push(
					...group.map((a: any) => ({
						...a,
						id: `activity_${a.id}`
					}))
				);
			}
		});
	});

	// Sort: follow activities first, then by date
	return grouped.sort((a, b) => {
		// Prioritize follow activities
		if (a.activity_type === 'follow' && b.activity_type !== 'follow') return -1;
		if (a.activity_type !== 'follow' && b.activity_type === 'follow') return 1;
		// Within same type, sort by date (newest first)
		return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
	});
}
