import type { EmailOtpType } from '@supabase/supabase-js'
import { redirect } from '@sveltejs/kit'

import type { RequestHandler } from './$types'

async function getUserRedirectPath(supabase: any, userId: string, fallback: string): Promise<string> {
    const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', userId)
        .single()

    return profile?.username ? `/${profile.username}` : fallback
}

export const GET: RequestHandler = async ({ url, locals: { supabase } }) => {
    const token_hash = url.searchParams.get('token_hash')
    const type = url.searchParams.get('type') as EmailOtpType | null
    const next = url.searchParams.get('next')

    /**
     * Clean up the redirect URL by deleting the Auth flow parameters.
     */
    const redirectTo = new URL(url)
    redirectTo.searchParams.delete('token_hash')
    redirectTo.searchParams.delete('type')
    redirectTo.searchParams.delete('next')

    if (token_hash && type) {
        const { error, data } = await supabase.auth.verifyOtp({ type, token_hash })
        if (!error) {
            const targetPath = next ?? (data.user
                ? await getUserRedirectPath(supabase, data.user.id, '/account')
                : '/account')
            redirectTo.pathname = targetPath
            redirect(303, redirectTo)
        }
    }

    // Handle PKCE flow where Supabase sends a code instead of token_hash
    const code = url.searchParams.get('code')
    if (code) {
        const { error, data } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) {
            redirectTo.searchParams.delete('code')
            const targetPath = next ?? (data.user
                ? await getUserRedirectPath(supabase, data.user.id, '/account')
                : '/account')
            redirectTo.pathname = targetPath
            redirect(303, redirectTo)
        }
    }

    redirectTo.pathname = '/auth/confirm/error'
    redirect(303, redirectTo)
}