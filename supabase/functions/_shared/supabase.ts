import { createClient } from 'npm:@supabase/supabase-js@2';

type Env = Record<string, string | undefined>;

export function getSupabaseAdminClient(env: Env) {
	const supabaseUrl = env.EDGE_SUPABASE_URL;
	const supabaseServiceRoleKey = env.EDGE_SUPABASE_SERVICE_ROLE_KEY;

	if (!supabaseUrl) {
		throw new Error('Missing EDGE_SUPABASE_URL');
	}

	if (!supabaseServiceRoleKey) {
		throw new Error('Missing EDGE_SUPABASE_SERVICE_ROLE_KEY');
	}

	return createClient(supabaseUrl, supabaseServiceRoleKey, {
		auth: {
			autoRefreshToken: false,
			persistSession: false
		}
	});
}
