import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals: { supabase } }) => {
	const code = url.searchParams.get('code');
	const next = url.searchParams.get('next');

	if (code) {
		const { error, data } = await supabase.auth.exchangeCodeForSession(code);
		if (!error) {
			if (next) {
				redirect(303, next);
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
	}

	redirect(303, '/auth/error');
};
