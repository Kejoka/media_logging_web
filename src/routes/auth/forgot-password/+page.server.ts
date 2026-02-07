import { fail, redirect } from '@sveltejs/kit'
import type { Actions, PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals: { safeGetSession } }) => {
    const { session } = await safeGetSession()

    if (session) {
        redirect(303, '/account')
    }
}

export const actions: Actions = {
    default: async ({ request, url, locals: { supabase } }) => {
        const formData = await request.formData()
        const email = formData.get('email') as string

        if (!email) {
            return fail(400, { error: 'Email is required', email })
        }

        const validEmail = /^[\w\-\.+]+@([\w-]+\.)+[\w-]{2,8}$/.test(email)
        if (!validEmail) {
            return fail(400, { error: 'Please enter a valid email address', email })
        }

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${url.origin}/auth/callback?next=/auth/update-password`,
        })

        if (error) {
            return fail(500, { error: 'Something went wrong. Please try again later.', email })
        }

        // Always show success even if email doesn't exist (prevents email enumeration)
        return { success: true, message: 'If an account with that email exists, you will receive a password reset link.' }
    }
}
