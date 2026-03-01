import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals: { safeGetSession, supabase }, cookies }) => {
	const { session, user } = await safeGetSession();
	let ownProfileUsername: string | null = null;

	if (session?.user?.id) {
		const { data: profile } = await supabase
			.from('profiles')
			.select('username')
			.eq('id', session.user.id)
			.maybeSingle();

		ownProfileUsername = profile?.username ?? null;
	}

	return {
		session,
		user,
		ownProfileUsername,
		cookies: cookies.getAll()
	};
};
