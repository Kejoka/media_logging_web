/** @type {import('./$types').RequestHandler} */
export async function POST({ request, locals: { supabase, safeGetSession } }) {
	const medium_data_from_request = (await request.json()) as Record<string, any>;
	const current_medium = medium_data_from_request.current_medium;
	const medium = medium_data_from_request.last_selection;
	const sync_timestamp = medium_data_from_request.sync_timestamp;
	const { session } = await safeGetSession();
	let error;
	try {
		error = await supabase.from('profiles').upsert({
			id: session?.user.id,
			updated_at: sync_timestamp
		});
		switch (current_medium) {
			case 'games':
				error = await supabase
					.from(current_medium)
					.insert({
						user_id: session?.user.id,
						igdbid: medium.igdbid,
						title: medium.title,
						image: medium.image,
						release: medium.release,
						genres: medium.genres,
						platforms: medium.platforms,
						averagerating: Number(medium.averagerating / 10).toFixed(1),
						rating: 0,
						backlogged: medium.backlogged || 0,
						added: medium.added,
						trophy: 0,
						notes: medium.notes || '',
						is_rewatch: false,
						rewatch_count: 1
					})
					.select()
					.single();
				// Calculate rewatch status based on duplicates (exclude backlog)
				if (error.data && medium.igdbid) {
					const duplicates = await supabase
						.from(current_medium)
						.select('id, added')
						.eq('user_id', session?.user.id)
						.eq('igdbid', medium.igdbid)
						.eq('backlogged', 0)
						.order('added', { ascending: true });

					if (duplicates.data && duplicates.data.length > 1) {
						const count = duplicates.data.length;
						const firstEntryId = duplicates.data[0].id;

						// Update entries
						await supabase
							.from(current_medium)
							.update({ is_rewatch: true, rewatch_count: count })
							.eq('igdbid', medium.igdbid)
							.eq('user_id', session?.user.id)
							.eq('backlogged', 0);
						await supabase
							.from(current_medium)
							.update({ is_rewatch: false, rewatch_count: count })
							.eq('id', firstEntryId);
					}
				}

				// Log activity for notifications
				if (error.data) {
					await supabase.from('user_activities').insert({
						user_id: session?.user.id,
						activity_type: 'add',
						media_type: current_medium,
						media_title: medium.title,
						details: {
							media_id: error.data.id,
							media_year: new Date(medium.added).getFullYear(),
							backlogged: medium.backlogged || 0
						}
					});
				}
				return new Response(JSON.stringify(error));
			case 'movies':
				error = await supabase
					.from(current_medium)
					.insert({
						user_id: session?.user.id,
						tmdbid: medium.tmdbid,
						title: medium.title,
						image: medium.image,
						release: medium.release,
						genres: medium.genres,
						averagerating: medium.averagerating.toFixed(1),
						rating: 0,
						backlogged: medium.backlogged || 0,
						added: medium.added,
						notes: medium.notes || '',
						is_rewatch: false,
						rewatch_count: 1
					})
					.select()
					.single();

				// Calculate rewatch status based on duplicates (exclude backlog)
				if (error.data && medium.tmdbid) {
					const duplicates = await supabase
						.from(current_medium)
						.select('id, added')
						.eq('user_id', session?.user.id)
						.eq('tmdbid', medium.tmdbid)
						.eq('backlogged', 0)
						.order('added', { ascending: true });

					if (duplicates.data && duplicates.data.length > 1) {
						const count = duplicates.data.length;
						const firstEntryId = duplicates.data[0].id;

						// Update entries
						await supabase
							.from(current_medium)
							.update({ is_rewatch: true, rewatch_count: count })
							.eq('tmdbid', medium.tmdbid)
							.eq('backlogged', 0)
							.eq('user_id', session?.user.id);
						await supabase
							.from(current_medium)
							.update({ is_rewatch: false, rewatch_count: count })
							.eq('id', firstEntryId);
					}
				}

				// Log activity for notifications
				if (error.data) {
					await supabase.from('user_activities').insert({
						user_id: session?.user.id,
						activity_type: 'add',
						media_type: current_medium,
						media_title: medium.title,
						details: {
							media_id: error.data.id,
							media_year: new Date(medium.added).getFullYear(),
							backlogged: medium.backlogged || 0
						}
					});
				}
				return new Response(JSON.stringify(error));
			case 'shows':
				error = await supabase
					.from(current_medium)
					.insert({
						user_id: session?.user.id,
						tmdbid: medium.tmdbid,
						title: medium.title,
						image: medium.image,
						release: medium.release,
						genres: medium.genres,
						averagerating: medium.averagerating.toFixed(1),
						rating: 0,
						backlogged: medium.backlogged || 0,
						added: medium.added,
						episode: 0,
						notes: medium.notes || '',
						is_rewatch: false,
						rewatch_count: 1
					})
					.select()
					.single();

				// Calculate rewatch status based on duplicates (exclude backlog)
				if (error.data && medium.tmdbid) {
					const duplicates = await supabase
						.from(current_medium)
						.select('id, added')
						.eq('user_id', session?.user.id)
						.eq('tmdbid', medium.tmdbid)
						.eq('backlogged', 0)
						.order('added', { ascending: true });

					if (duplicates.data && duplicates.data.length > 1) {
						const count = duplicates.data.length;
						const firstEntryId = duplicates.data[0].id;

						// Update entries
						await supabase
							.from(current_medium)
							.update({ is_rewatch: true, rewatch_count: count })
							.eq('tmdbid', medium.tmdbid)
							.eq('backlogged', 0)
							.eq('user_id', session?.user.id);
						await supabase
							.from(current_medium)
							.update({ is_rewatch: false, rewatch_count: count })
							.eq('id', firstEntryId);
					}
				}

				// Log activity for notifications
				if (error.data) {
					await supabase.from('user_activities').insert({
						user_id: session?.user.id,
						activity_type: 'add',
						media_type: current_medium,
						media_title: medium.title,
						details: {
							media_id: error.data.id,
							media_year: new Date(medium.added).getFullYear(),
							backlogged: medium.backlogged || 0
						}
					});
				}
				return new Response(JSON.stringify(error));
			case 'books':
				error = await supabase
					.from(current_medium)
					.insert({
						user_id: session?.user.id,
						gbid: medium.gbid,
						title: medium.title,
						subtitle: medium.subtitle,
						author: medium.author,
						image: medium.image,
						release: medium.release,
						genres: medium.genres,
						pagecount: medium.pagecount,
						averagerating: medium.averagerating,
						rating: 0,
						backlogged: medium.backlogged || 0,
						added: medium.added,
						notes: medium.notes || '',
						is_rewatch: false,
						rewatch_count: 1
					})
					.select()
					.single();

				// Calculate rewatch status based on duplicates (exclude backlog)
				if (error.data && medium.gbid) {
					const duplicates = await supabase
						.from(current_medium)
						.select('id, added')
						.eq('user_id', session?.user.id)
						.eq('gbid', medium.gbid)
						.eq('backlogged', 0)
						.order('added', { ascending: true });

					if (duplicates.data && duplicates.data.length > 1) {
						const count = duplicates.data.length;
						const firstEntryId = duplicates.data[0].id;

						// Update entries
						await supabase
							.from(current_medium)
							.update({ is_rewatch: true, rewatch_count: count })
							.eq('gbid', medium.gbid)
							.eq('backlogged', 0)
							.eq('user_id', session?.user.id);
						await supabase
							.from(current_medium)
							.update({ is_rewatch: false, rewatch_count: count })
							.eq('id', firstEntryId);
					}
				}

				// Log activity for notifications
				if (error.data) {
					await supabase.from('user_activities').insert({
						user_id: session?.user.id,
						activity_type: 'add',
						media_type: current_medium,
						media_title: medium.title,
						details: {
							media_id: error.data.id,
							media_year: new Date(medium.added).getFullYear(),
							backlogged: medium.backlogged || 0
						}
					});
				}
				return new Response(JSON.stringify(error));
			default:
				throw 'Switch Statement failed';
		}
	} catch (error) {
		console.log(`Error on Endpoint addMedium: \n ${error}`);
		return new Response(String(error));
	}
}
