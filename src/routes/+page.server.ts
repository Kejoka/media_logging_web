import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, safeGetSession } }) => {
	const { session } = await safeGetSession();

	if (session) {
		const { data: profile } = await supabase
			.from('profiles')
			.select('username')
			.eq('id', session.user.id)
			.single();

		if (profile?.username) {
			redirect(303, `/${profile.username}`);
		}
		redirect(303, '/account');
	}
};

export const actions: Actions = {
	login: async ({ request, locals: { supabase } }) => {
		const formData = await request.formData();
		const email = formData.get('email') as string;
		const password = formData.get('password') as string;

		if (!email) {
			return fail(400, { error: 'E-Mail ist erforderlich', email });
		}

		if (!password) {
			return fail(400, { error: 'Passwort ist erforderlich', email });
		}

		const { error, data } = await supabase.auth.signInWithPassword({ email, password });

		if (error) {
			return fail(400, { error: 'Ungültige E-Mail oder Passwort', email });
		}

		if (data.user) {
			const { data: profile } = await supabase
				.from('profiles')
				.select('username')
				.eq('id', data.user.id)
				.single();

			if (profile?.username) {
				redirect(303, `/${profile.username}`);
			}
		}

		redirect(303, '/account');
	}
};
