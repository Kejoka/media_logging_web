import { createBrowserClient, createServerClient, isBrowser } from '@supabase/ssr'
import { PUBLIC_SUPABASE_ANON, PUBLIC_SUPABASE_URL } from '$env/static/public'
import type { LayoutLoad } from './$types'

export const load: LayoutLoad = async ({ data, depends, fetch }) => {
	/**
	 * Declare a dependency so the layout can be invalidated, for example, on
	 * session refresh.
	 */
	depends('supabase:auth')

	const supabase = isBrowser()
		? createBrowserClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON, {
			global: {
				fetch,
			},
		})
		: createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON, {
			global: {
				fetch,
			},
			cookies: {
				getAll() {
					return data.cookies
				},
			},
		})

	/**
	 * It's fine to use `getSession` here, because on the client, `getSession` is
	 * safe, and on the server, it reads `session` from the `LayoutData`, which
	 * safely checked the session using `safeGetSession`.
	 */
	const {
		data: { session },
	} = await supabase.auth.getSession()

	// Only get user if we have a session to avoid AuthSessionMissingError
	let user = null
	if (session) {
		try {
			const {
				data: { user: userData },
			} = await supabase.auth.getUser()
			user = userData
		} catch (error) {
			// Handle auth errors gracefully
			console.warn('Error getting user:', error)
		}
	}

	return { session, supabase, user }
}