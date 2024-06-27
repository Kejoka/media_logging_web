import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, safeGetSession }, url }) => {
	const { session } = await safeGetSession();
	if (!session) {
		redirect(303, '/');
	}

	const { data: profile } = await supabase
		.from('profiles')
		.select(`username, avatar_url`)
		.eq('id', session.user.id)
		.single();

	if (url.pathname.slice(1).split('/')[0] !== profile?.username) {
		// IMPORTANT This line redirects the user to their own profile. This should be chnaged
		// as soon as public user profiles have been implemented
		redirect(303, `/${profile?.username}/movieswiper?profile=${url.searchParams.get('profile')}`);
	}

	const { data } = await supabase
		.from('preference_profiles')
		.select('id')
		.eq('user_id', session.user.id)
		.eq('name', url.searchParams.get('profile'))
		.single();

	return { session, profile, data };
};

export type TmdbMovie = {
	adult: boolean;
	backdrop_path: string;
	genre_ids: number[];
	id: number;
	overview: string;
	popularity: number;
	poster_path: string;
	release_date: string;
	vote_average: number;
	title: string;
	image: string;
};
