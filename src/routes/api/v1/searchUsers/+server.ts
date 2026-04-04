import { delay } from '$lib/utils';
import type { RequestEvent } from './$types';

const RETRIES = 3;

type ProfileRow = {
	id: string;
	username: string;
};

type FollowingRow = {
	followee: string;
};

export async function POST({ request, locals }: RequestEvent) {
	const { supabase, safeGetSession } = locals;
	const { session } = await safeGetSession();
	if (!session) {
		return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
	}

	const req_body = (await request.json()) as { search_val: string };
	const search_val = req_body.search_val.trim();
	if (search_val.length === 0) {
		return new Response(JSON.stringify([]), {
			headers: {
				'Content-Type': 'application/json'
			}
		});
	}

	let try_count = 0;
	while (try_count < RETRIES) {
		try {
			const res = await supabase
				.from('profiles')
				.select('id, username')
				.ilike('username', `%${search_val}%`)
				.neq('id', session.user.id)
				.order('username');

			if (res.error) {
				throw res.error;
			}

			const profileRows: ProfileRow[] = res.data ?? [];
			const profileIds = profileRows.map((profile) => profile.id);

			const followingQueryResult =
				profileIds.length > 0
					? await supabase
						.from('following')
						.select('followee')
						.eq('follower', session.user.id)
						.in('followee', profileIds)
					: { data: [] as FollowingRow[], error: null };

			if (followingQueryResult.error) {
				throw followingQueryResult.error;
			}

			const followingRows: FollowingRow[] = followingQueryResult.data ?? [];
			const followingSet = new Set(followingRows.map((row) => String(row.followee)));

			return new Response(
				JSON.stringify(
					profileRows.map((profile) => ({
						username: profile.username,
						isFollowing: followingSet.has(String(profile.id))
					}))
				),
				{
					headers: {
						'Content-Type': 'application/json'
					}
				}
			);
		} catch (error) {
			console.log(`Error on Endpoint searchUsers: ${error}`);
			console.log('Retrying in 1s..');
			await delay(1000);
		}
		try_count++;
	}

	return new Response(
		JSON.stringify({ error: `No success fetching search suggestions after ${RETRIES} retries` }),
		{
			status: 500,
			headers: {
				'Content-Type': 'application/json'
			}
		}
	);
}
