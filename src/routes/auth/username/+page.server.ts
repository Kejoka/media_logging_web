import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	const { data, error } = await supabase.auth.getUser();
	if (error) {
		console.error(error);
		redirect(303, '/')
	} else {
		const { data: profile } = await supabase
			.from('profiles')
			.select()
			.eq('id', data.user.id)
			.single();
		if (profile?.username != null && profile.username.trim().length != 0) {
			redirect(303, `/private/${profile?.username}`);
		} else {
			return { profile };
		}
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

		console.log("ERROR:", error)

		if (error) {
			return fail(500, {
				username,
				error
			});
		}

		return {
			username
		};
	}
};
