import { cleanupOldNotifications } from '../_shared/media.ts';
import { getSupabaseAdminClient } from '../_shared/supabase.ts';

const headers = {
	'content-type': 'application/json; charset=utf-8'
};

Deno.serve(async () => {
	try {
		const supabase = getSupabaseAdminClient(Deno.env.toObject());
		const result = await cleanupOldNotifications(supabase);

		return new Response(JSON.stringify({ ok: true, ...result }), {
			headers
		});
	} catch (error) {
		console.error('cleanup-retention failed', error);
		return new Response(
			JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }),
			{
				status: 500,
				headers
			}
		);
	}
});
