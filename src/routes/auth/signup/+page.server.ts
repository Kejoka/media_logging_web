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
	signup: async ({ request, url, locals: { supabase } }) => {
		const formData = await request.formData();
		const email = formData.get('email') as string;
		const password = formData.get('password') as string;
		const confirmPassword = formData.get('confirmPassword') as string;
		let username = (formData.get('username') as string) ?? '';
		username = username.trim().toLowerCase();

		if (!email) {
			return fail(400, { error: 'Email is required', email, username });
		}

		const validEmail = /^[\w\-\.+]+@([\w-]+\.)+[\w-]{2,8}$/.test(email);
		if (!validEmail) {
			return fail(400, { error: 'Bitte gib eine valide Email-Adresse ein', email, username });
		}

		if (!username || username.length < 3) {
			return fail(400, {
				error: 'Benutzername muss mindestens 3 Zeichen lang sein',
				email,
				username
			});
		}

		// Only allow lowercase letters, numbers and underscores to keep usernames URL-safe
		if (!/^[a-z0-9_]+$/.test(username)) {
			return fail(400, {
				error: 'Benutzername darf nur Kleinbuchstaben, Zahlen und Unterstriche enthalten',
				email,
				username
			});
		}

		if (!password || password.length < 8) {
			return fail(400, { error: 'Passwort muss mindestens 8 Zeichen lang sein', email, username });
		}

		if (password !== confirmPassword) {
			return fail(400, { error: 'Passwörter stimmen nicht überein', email, username });
		}

		// Check if username is already taken (use maybeSingle to avoid errors when no row)
		const { data: existingUser, error: existingUserError } = await supabase
			.from('profiles')
			.select('username')
			.eq('username', username)
			.maybeSingle();

		if (existingUserError) {
			return fail(500, {
				error: 'Datenbankfehler bei der Überprüfung des Benutzernamens',
				email,
				username
			});
		}

		if (existingUser?.username) {
			return fail(400, { error: 'Benutzername ist bereits vergeben', email, username });
		}

		const { error } = await supabase.auth.signUp({
			email,
			password,
			options: {
				emailRedirectTo: `${url.origin}/auth/callback`,
				data: {
					username
				}
			}
		});

		if (error) {
			return fail(400, { error: error.message, email, username });
		}

		return { success: true, message: 'Bitte überprüfe deine Email, um dein Konto zu bestätigen.' };
	}
};
