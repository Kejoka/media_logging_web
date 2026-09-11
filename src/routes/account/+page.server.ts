import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	MEDIA_TYPE_ORDER,
	isMediaType,
	normalize_notification_preferences,
	serialize_enabled_media_types,
	type MediaType,
	type NotificationPreferences
} from '$lib/utils';

function getNotificationPreferencesFromForm(formData: FormData): NotificationPreferences {
	const preferences = normalize_notification_preferences(null);

	for (const mediaType of MEDIA_TYPE_ORDER) {
		preferences[mediaType] = {
			backlog_adds: formData.has(`notification_${mediaType}_backlog_adds`),
			regular_adds: formData.has(`notification_${mediaType}_regular_adds`)
		};
	}

	return preferences;
}

export const load: PageServerLoad = async ({ locals: { supabase, safeGetSession } }) => {
	const { session } = await safeGetSession();

	if (!session) {
		redirect(303, '/');
	}

	const { data: profile } = await supabase
		.from('profiles')
		.select(`username, enabled_media_types`)
		.eq('id', session.user.id)
		.single();

	const { data: notificationSettings } = await supabase
		.from('notification_preferences')
		.select('notifications_enabled, preferences')
		.eq('user_id', session.user.id)
		.maybeSingle();

	return { session, profile, notificationSettings };
};

export const actions: Actions = {
	update: async ({ request, locals: { supabase, safeGetSession } }) => {
		const formData = await request.formData();
		const { session } = await safeGetSession();

		if (!session) {
			redirect(303, '/');
		}

		const fullName = formData.get('fullName') as string;
		let username = (formData.get('username') as string) ?? '';
		username = username.trim();
		const website = formData.get('website') as string;
		const avatarUrl = formData.get('avatarUrl') as string;
		const enabled_media_types_values = formData
			.getAll('enabled_media_types')
			.map((value) => String(value));
		const enabled_media_types = MEDIA_TYPE_ORDER.filter((type) =>
			enabled_media_types_values.some((value) => isMediaType(value) && value === type)
		) as MediaType[];
		let notifications_enabled: boolean;
		let notification_preferences: NotificationPreferences;

		if (formData.has('notification_settings_submitted')) {
			notifications_enabled = formData.has('notifications_enabled');
			notification_preferences = getNotificationPreferencesFromForm(formData);
		} else {
			const { data: currentNotificationSettings } = await supabase
				.from('notification_preferences')
				.select('notifications_enabled, preferences')
				.eq('user_id', session.user.id)
				.maybeSingle();
			notifications_enabled = currentNotificationSettings?.notifications_enabled !== false;
			notification_preferences = normalize_notification_preferences(
				currentNotificationSettings?.preferences
			);
		}

		const notificationFormState = {
			notifications_enabled,
			notification_preferences
		};

		if (enabled_media_types.length === 0) {
			return fail(400, {
				...notificationFormState,
				fullName,
				username,
				website,
				avatarUrl,
				enabled_media_types,
				error: 'Mindestens ein Medientyp muss aktiv bleiben'
			});
		}

		// Validate and check if username is taken by another user
		if (username) {
			if (username.length < 3) {
				return fail(400, {
					...notificationFormState,
					fullName,
					username,
					website,
					avatarUrl,
					enabled_media_types,
					error: 'Username must be at least 3 characters'
				});
			}

			if (!/^[A-Za-z0-9_]+$/.test(username)) {
				return fail(400, {
					...notificationFormState,
					fullName,
					username,
					website,
					avatarUrl,
					enabled_media_types,
					error: 'Username can only contain letters, numbers, and underscores'
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
					...notificationFormState,
					fullName,
					username,
					website,
					avatarUrl,
					enabled_media_types,
					error: 'Database error checking username'
				});
			}

			if (existingUser?.id) {
				return fail(400, {
					...notificationFormState,
					fullName,
					username,
					website,
					avatarUrl,
					enabled_media_types,
					error: 'Username is already taken'
				});
			}
		}

		const updates: Record<string, unknown> = {
			id: session.user.id,
			updated_at: new Date()
		};

		if (fullName != null && fullName !== '') updates.full_name = fullName;
		if (username != null && username !== '') updates.username = username;
		if (website != null && website !== '') updates.website = website;
		if (avatarUrl != null && avatarUrl !== '') updates.avatar_url = avatarUrl;
		updates.enabled_media_types = serialize_enabled_media_types(enabled_media_types);

		const { error } = await supabase.from('profiles').upsert(updates);

		if (error) {
			return fail(500, {
				...notificationFormState,
				fullName,
				username,
				website,
				avatarUrl,
				enabled_media_types,
				error: error.message
			});
		}

		const { error: notificationSettingsError } = await supabase
			.from('notification_preferences')
			.upsert({
				user_id: session.user.id,
				notifications_enabled,
				preferences: notification_preferences,
				updated_at: new Date().toISOString()
			});

		if (notificationSettingsError) {
			return fail(500, {
				...notificationFormState,
				fullName,
				username,
				website,
				avatarUrl,
				enabled_media_types,
				error: notificationSettingsError.message
			});
		}

		return {
			...notificationFormState,
			fullName,
			username,
			website,
			avatarUrl,
			enabled_media_types,
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
