import { fail, redirect } from '@sveltejs/kit'
import type { Actions, PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals: { supabase, safeGetSession } }) => {
    const { session } = await safeGetSession()

    if (session) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', session.user.id)
            .single()

        if (profile?.username) {
            redirect(303, `/${profile.username}`)
        }
        redirect(303, '/account')
    }
}

export const actions: Actions = {
    signup: async ({ request, url, locals: { supabase } }) => {
        const formData = await request.formData()
        const email = formData.get('email') as string
        const password = formData.get('password') as string
        const confirmPassword = formData.get('confirmPassword') as string
        const username = formData.get('username') as string

        if (!email) {
            return fail(400, { error: 'Email is required', email, username })
        }

        const validEmail = /^[\w\-\.+]+@([\w-]+\.)+[\w-]{2,8}$/.test(email)
        if (!validEmail) {
            return fail(400, { error: 'Please enter a valid email address', email, username })
        }

        if (!username || username.length < 3) {
            return fail(400, { error: 'Username must be at least 3 characters', email, username })
        }

        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            return fail(400, { error: 'Username can only contain letters, numbers, and underscores', email, username })
        }

        if (!password || password.length < 8) {
            return fail(400, { error: 'Password must be at least 8 characters', email, username })
        }

        if (password !== confirmPassword) {
            return fail(400, { error: 'Passwords do not match', email, username })
        }

        // Check if username is already taken
        const { data: existingUser } = await supabase
            .from('profiles')
            .select('username')
            .eq('username', username)
            .single()

        if (existingUser) {
            return fail(400, { error: 'Username is already taken', email, username })
        }

        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: `${url.origin}/auth/callback`,
                data: {
                    username,
                },
            },
        })

        if (error) {
            return fail(400, { error: error.message, email, username })
        }

        return { success: true, message: 'Please check your email to confirm your account.' }
    }
}
