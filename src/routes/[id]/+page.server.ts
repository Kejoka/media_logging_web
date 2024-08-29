import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({
    locals: { supabase, safeGetSession },
    fetch,
    url
}) => {
    const { session } = await safeGetSession();
    if (!session) {
        redirect(303, '/');
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select()
        .eq('id', session.user.id)
        .single();

    if (url.pathname.slice(1).split('/')[0] !== profile?.username) {
        // IMPORTANT This line redirects the user to their own profile. This should be chnaged
        // as soon as public user profiles have been implemented
        redirect(303, `/${profile?.username}`);
    }
    const games = await supabase.from('games').select().eq('user_id', session.user.id).order('added', { ascending: false });
    const movies = await supabase.from('movies').select().eq('user_id', session.user.id).order('added', { ascending: false });
    const shows = await supabase.from('shows').select().eq('user_id', session.user.id).order('added', { ascending: false });
    const books = await supabase.from('books').select().eq('user_id', session.user.id).order('added', { ascending: false });

    return { session, profile, games, movies, shows, books };
};
