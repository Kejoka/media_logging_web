// src/routes/+page.server.ts
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';


export const load: PageServerLoad = async ({ url, locals: { supabase, safeGetSession } }) => {
	console.log(await safeGetSession());
	// const { data: profile } = await supabase
	// 	.from('profiles')
	// 	.select('username')
	// 	.eq('id', session.user.id)
	// 	.limit(1)
	// 	.single();
	// if (profile?.username != null && profile.username.trim().length != 0) {
	// 	redirect(303, `/${profile?.username}`);
	// }
	// else {
	// 	redirect(303, `/auth/username`);
	// }
	// return { url: url.origin };
};
