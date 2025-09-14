import { redirect } from '@sveltejs/kit'
import type { Actions } from './$types'
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
        console.error(error);
    } else {
        const { data: profile } = await supabase
            .from('profiles')
            .select()
            .eq('id', data.user.id)
            .single();
        if (!profile.username || profile.username.trim().length != 0) {
            redirect(303, '/auth/username')
        } else {
            redirect(303, `/private/${profile.username}`);
        }
    }
};

export const actions: Actions = {
    signup: async ({ request, locals: { supabase } }) => {
        const formData = await request.formData()
        const email = formData.get('email') as string
        const password = formData.get('password') as string

        const { error } = await supabase.auth.signUp({ email, password })
        if (error) {
            console.error(error)
            redirect(303, '/auth/error')
        } else {
            redirect(303, '/')
        }
    },
    login: async ({ request, locals: { supabase } }) => {
        const formData = await request.formData()
        const email = formData.get('email') as string
        const password = formData.get('password') as string

        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) {
            console.error(error)
            redirect(303, '/auth/error')
        } else {
            redirect(303, '/private')
        }
    },
}