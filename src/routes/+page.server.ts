// src/routes/+page.server.ts
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { supabase } from '$lib/supabaseClient';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';

export const load: PageServerLoad = async ({ url, locals: { safeGetSession } }) => {
	const { session } = await safeGetSession();

	// if the user is already logged in return them to the account page
	if (session) {
		const { data: profile } = await supabase
			.from('profiles')
			.select('username')
			.eq('id', session.user.id)
			.limit(1)
			.single();

		if (profile?.username != null) {
			redirect(303, `/${profile?.username}`);
		}
		redirect(303, `/username`);

	}

	console.log(PUBLIC_SUPABASE_URL)

	return { url: url.origin };
};
