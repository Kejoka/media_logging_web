import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, safeGetSession }, url }) => {
	const { data, error } = await supabase.auth.getUser();
	if (error) {
		console.error(error);
		redirect(303, '/')
	} else {
		const { data: profile } = await supabase
			.from('profiles')
			.select(`username`)
			.eq('id', data.user.id)
			.single();

		if (url.pathname.slice(1).split('/')[1] !== profile?.username) {
			redirect(303, `/private/${profile?.username}`);
		}
		return { profile };
	}
};

export const actions: Actions = {
	update: async ({ request, locals: { supabase, safeGetSession } }) => {
		const form_data = await request.formData();
		const username = form_data.get('username') as string;

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
	},
	signout: async ({ locals: { supabase, safeGetSession } }) => {
		const { session } = await safeGetSession();
		if (session) {
			await supabase.auth.signOut();
			redirect(303, '/');
		}
	}
};
