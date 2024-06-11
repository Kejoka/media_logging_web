import { fail, redirect } from '@sveltejs/kit'
import type { Actions, PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals: { supabase, safeGetSession }, url }) => {
    const { session } = await safeGetSession()
    if (!session) {
        redirect(303, '/')
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select(`username, avatar_url`)
        .eq('id', session.user.id)
        .single()
        
    if (url.pathname.slice(1) !== profile?.username) {
        // IMPORTANT This line redirects the user to their own profile. This should be chnaged
        // as soon as public user profiles have been implemented
        redirect(303, `/${profile?.username}`);
    }
    return { session, profile }
}

export const actions: Actions = {
    update: async ({ request, locals: { supabase, safeGetSession } }) => {
        const formData = await request.formData()
        const username = formData.get('username') as string

        const { session } = await safeGetSession()

        const { error } = await supabase.from('profiles').upsert({
            id: session?.user.id,
            username,
            updated_at: new Date(),
        })

        if (error) {
            return fail(500, {
                username,
            })
        }

        return {
            username,
        }
    },
    signout: async ({ locals: { supabase, safeGetSession } }) => {
        const { session } = await safeGetSession()
        if (session) {
            await supabase.auth.signOut()
            redirect(303, '/')
        }
    },
}
