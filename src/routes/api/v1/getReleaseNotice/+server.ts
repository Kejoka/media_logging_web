import { currentReleaseNote } from '$lib/releaseNotes';

export async function GET({ locals: { supabase, safeGetSession } }) {
	const { session } = await safeGetSession();

	if (!session) {
		return new Response(JSON.stringify({ show: false }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const { data: acknowledgement, error } = await supabase
		.from('user_release_acknowledgements')
		.select('release_version')
		.eq('user_id', session.user.id)
		.eq('release_version', currentReleaseNote.version)
		.maybeSingle();

	if (error) {
		console.error('Error checking release acknowledgement:', error);
		return new Response(JSON.stringify({ error: 'Failed to check release notice' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	return new Response(
		JSON.stringify({
			show: !acknowledgement,
			release: currentReleaseNote
		}),
		{
			headers: { 'Content-Type': 'application/json' }
		}
	);
}
