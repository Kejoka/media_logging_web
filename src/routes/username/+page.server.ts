import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, safeGetSession } }) => {
	const { session } = await safeGetSession();
	if (!session) {
		redirect(303, '/');
	}

	const { data: profile } = await supabase
		.from('profiles')
		.select(`username, avatar_url`)
		.eq('id', session?.user.id)
		.single();

	if (profile?.username != null) {
		redirect(303, `/${profile?.username}`);
	}

	return { session, profile };
};

export const actions: Actions = {
	update: async ({ request, locals: { supabase, safeGetSession } }) => {
		const formData = await request.formData();
		const username = formData.get('username') as string;

		const { session } = await safeGetSession();

		const { error } = await supabase.from('profiles').upsert({
			id: session?.user.id,
			username,
			updated_at: new Date()
		});

		if (error) {
			return fail(500, {
				username
			});
		}

		return {
			username
		};
	}
};
