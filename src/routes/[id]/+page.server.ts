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
    let user_id: string;
    if (url.pathname.slice(1).split('/')[0] !== profile?.username) {
        const res = await supabase
            .from('profiles')
            .select()
            .eq('username', url.pathname.slice(1).split('/')[0])
            .single();
        if (res.status == 200) {
            user_id = res.data.id
        }
        else {
            redirect(303, `/${profile?.username}`);
        }
    } else {
        user_id = session.user.id
    }
    const games = await supabase.from('games').select().eq('user_id', user_id).order('added', { ascending: false });
    const movies = await supabase.from('movies').select().eq('user_id', user_id).order('added', { ascending: false });
    const shows = await supabase.from('shows').select().eq('user_id', user_id).order('added', { ascending: false });
    const books = await supabase.from('books').select().eq('user_id', user_id).order('added', { ascending: false });

    return { session, profile, user_id, games, movies, shows, books };
};
