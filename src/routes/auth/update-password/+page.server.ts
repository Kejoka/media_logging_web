import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { safeGetSession } }) => {
	const { session } = await safeGetSession();

	// User must be authenticated (via the recovery link) to update their password
	if (!session) {
		redirect(303, '/');
	}
};

export const actions: Actions = {
	default: async ({ request, locals: { supabase, safeGetSession } }) => {
		const { session } = await safeGetSession();

		if (!session) {
			redirect(303, '/');
		}

		const formData = await request.formData();
		const password = formData.get('password') as string;
		const confirmPassword = formData.get('confirmPassword') as string;

		if (!password || password.length < 8) {
			return fail(400, { error: 'Passwort muss mindestens 8 Zeichen lang sein' });
		}

		if (password !== confirmPassword) {
			return fail(400, { error: 'Passwörter stimmen nicht überein' });
		}

		const { error } = await supabase.auth.updateUser({ password });

		if (error) {
			return fail(500, {
				error: 'Fehler beim Aktualisieren des Passworts. Bitte versuche es erneut.'
			});
		}

		return { success: true, message: 'Dein Passwort wurde erfolgreich aktualisiert.' };
	}
};
