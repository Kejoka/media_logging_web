import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals: { supabase } }) => {
	const code = url.searchParams.get('code');
	const next = url.searchParams.get('next');

	if (code) {
		const { error, data } = await supabase.auth.exchangeCodeForSession(code);
		if (!error) {
			if (data.user) {
				const { error: loginTrackingError } = await supabase
					.from('user_login_metadata')
					.upsert(
						{ user_id: data.user.id, last_login_at: new Date().toISOString() },
						{ onConflict: 'user_id' }
					);

				if (loginTrackingError) {
					console.error('Could not track last login:', loginTrackingError);
				}
			}

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
