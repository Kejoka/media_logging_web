import { currentReleaseNote } from '$lib/releaseNotes';

export async function POST({ locals: { supabase, safeGetSession } }) {
	const { session } = await safeGetSession();

	if (!session) {
		return new Response(JSON.stringify({ error: 'Not authenticated' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const { error } = await supabase.from('user_release_acknowledgements').upsert(
		{
			user_id: session.user.id,
			release_version: currentReleaseNote.version,
			acknowledged_at: new Date().toISOString()
		},
		{ onConflict: 'user_id,release_version' }
	);

	if (error) {
		console.error('Error acknowledging release:', error);
		return new Response(JSON.stringify({ error: 'Failed to acknowledge release' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	return new Response(JSON.stringify({ success: true }), {
		headers: { 'Content-Type': 'application/json' }
	});
}
