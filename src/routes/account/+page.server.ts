import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, safeGetSession } }) => {
	const { session } = await safeGetSession();

	if (!session) {
		redirect(303, '/');
	}

	const { data: profile } = await supabase
		.from('profiles')
		.select(`username`)
		.eq('id', session.user.id)
		.single();
	return { session, profile };
};

export const actions: Actions = {
	update: async ({ request, locals: { supabase, safeGetSession } }) => {
		const formData = await request.formData();
		const fullName = formData.get('fullName') as string;
		let username = (formData.get('username') as string) ?? '';
		username = username.trim().toLowerCase();
		const website = formData.get('website') as string;
		const avatarUrl = formData.get('avatarUrl') as string;

		const { session } = await safeGetSession();

		if (!session) {
			redirect(303, '/');
		}

		// Validate and check if username is taken by another user
		if (username) {
			if (username.length < 3) {
				return fail(400, {
					fullName,
					username,
					website,
					avatarUrl,
					error: 'Username must be at least 3 characters'
				});
			}

			if (!/^[a-z0-9_]+$/.test(username)) {
				return fail(400, {
					fullName,
					username,
					website,
					avatarUrl,
					error: 'Username can only contain lowercase letters, numbers, and underscores'
				});
			}
			const { data: existingUser, error: existingUserError } = await supabase
				.from('profiles')
				.select('id, username')
				.eq('username', username)
				.neq('id', session.user.id)
				.maybeSingle();

			if (existingUserError) {
				return fail(500, {
					fullName,
					username,
					website,
					avatarUrl,
					error: 'Database error checking username'
				});
			}

			if (existingUser?.id) {
				return fail(400, {
					fullName,
					username,
					website,
					avatarUrl,
					error: 'Username is already taken'
				});
			}
		}

		const updates: Record<string, any> = {
			id: session.user.id,
			updated_at: new Date()
		};

		if (fullName != null && fullName !== '') updates.full_name = fullName;
		if (username != null && username !== '') updates.username = username;
		if (website != null && website !== '') updates.website = website;
		if (avatarUrl != null && avatarUrl !== '') updates.avatar_url = avatarUrl;

		const { data: updatedProfile, error } = await supabase
			.from('profiles')
			.upsert(updates)
			.select()
			.maybeSingle();

		if (error) {
			return fail(500, {
				fullName,
				username,
				website,
				avatarUrl,
				error: error.message
			});
		}

		return {
			fullName,
			username,
			website,
			avatarUrl,
			success: true
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
