import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase }, url }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
        console.error(error);
        redirect(303, '/')
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
