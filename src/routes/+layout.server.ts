import type { LayoutServerLoad } from './$types';
import { normalize_enabled_media_types } from '$lib/utils';

export const load: LayoutServerLoad = async ({ locals: { safeGetSession, supabase }, cookies }) => {
	const { session, user } = await safeGetSession();
	let ownProfileUsername: string | null = null;
	let ownProfileEnabledMediaTypes: string[] = [];

	if (session?.user?.id) {
		const { data: profile } = await supabase
			.from('profiles')
			.select('username, enabled_media_types')
			.eq('id', session.user.id)
			.maybeSingle();

		ownProfileUsername = profile?.username ?? null;
		ownProfileEnabledMediaTypes = normalize_enabled_media_types(profile?.enabled_media_types ?? null);
	}

	return {
		session,
		user,
		ownProfileUsername,
		ownProfileEnabledMediaTypes,
		cookies: cookies.getAll()
	};
};
