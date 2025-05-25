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
        let user_id: string = data.user.id;
        // User trying to access profile that isn't their own
        // Check if profile exists
        if (url.pathname.slice(1).split('/')[1] !== profile?.username) {
            const res = await supabase
                .from('profiles')
                .select()
                .eq('username', url.pathname.slice(1).split('/')[1])
                .single();
            // If so, accept user_id
            if (res.status == 200) {
                user_id = res.data.id
            }
            // Else redirect to own profile
            else {
                // If for some reason someone without a username lands here
                if (!profile.username || profile.username.trim().length != 0) {
                    redirect(303, '/auth/username')
                } else {
                    redirect(303, `/private/${profile.username}`);
                }
            }
        }
        const games = await supabase.from('games').select().eq('user_id', user_id).order('added', { ascending: false });
        const movies = await supabase.from('movies').select().eq('user_id', user_id).order('added', { ascending: false });
        const shows = await supabase.from('shows').select().eq('user_id', user_id).order('added', { ascending: false });
        const books = await supabase.from('books').select().eq('user_id', user_id).order('added', { ascending: false });
        return { profile, user_id, games, movies, shows, books };
    }
};
