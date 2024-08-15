// src/routes/+page.server.ts
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { supabase } from '$lib/supabaseClient';

export const load: PageServerLoad = async ({ url, locals: { safeGetSession } }) => {
    const { session } = await safeGetSession();

    // if the user is already logged in return them to the account page
    if (session) {
        const { data } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', session.user.id)
            .limit(1)
            .single();
        redirect(303, `/${data?.username}`);
    }

    return { url: url.origin };
};
