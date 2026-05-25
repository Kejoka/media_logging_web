/** @type {import('./$types').RequestHandler} */
export async function POST({ request, locals: { supabase, safeGetSession } }) {
	const req_body = (await request.json()) as {
		current_medium: string;
		medium_id: string;
		sync_timestamp: string;
	};
	const current_medium = req_body['current_medium'];
	const medium_id = req_body['medium_id'];
	const sync_timestamp = req_body['sync_timestamp'];
	const { session } = await safeGetSession();
	try {
		let error = await supabase.from('profiles').upsert({
			id: session?.user.id,
			updated_at: sync_timestamp
		});
		// Fetch medium information before deletion for activity logging and rewatch status recalculation
		const medium_to_delete = await supabase
			.from(current_medium)
			.select('*')
			.eq('id', medium_id)
			.single();
		// Perform the deletion
		error = await supabase.from(current_medium).delete().eq('id', medium_id);

		// Calculate rewatch status based on duplicates (exclude backlog)
		const medium_id_mapping = {
			games: 'igdbid',
			movies: 'tmdbid',
			shows: 'tmdbid',
			books: 'gbid'
		};
		const external_id_field = medium_id_mapping[current_medium as keyof typeof medium_id_mapping];
		if (medium_to_delete.data) {
			const duplicates = await supabase
				.from(current_medium)
				.select('id, added')
				.eq('user_id', session?.user.id)
				.eq(external_id_field, medium_to_delete.data[external_id_field])
				.eq('backlogged', 0)
				.order('added', { ascending: true });

			if (duplicates.data && duplicates.data.length > 1) {
				const count = duplicates.data.length;
				const firstEntryId = duplicates.data[0].id;

				// Update entries
				await supabase
					.from(current_medium)
					.update({ is_rewatch: true, rewatch_count: count })
					.eq(external_id_field, medium_to_delete.data[external_id_field])
					.eq('backlogged', 0)
					.eq('user_id', session?.user.id);
				await supabase
					.from(current_medium)
					.update({ is_rewatch: false, rewatch_count: count })
					.eq('id', firstEntryId);
			}
		}

		// Log activity for notifications
		if (!error.error) {
			await supabase
				.from('user_activities')
				.delete()
				.eq('user_id', session?.user.id)
				.eq('details->>media_id', medium_id);
		}

		// Return both the deletion error and the updated entries for client-side sync
		return new Response(JSON.stringify(error));
	} catch (error) {
		console.log(`Error on Endpoint deleteMedium: \n ${error}`);
		return new Response(String(error));
	}
}
