import { recalculateRewatchForMedium } from '$lib/server/rewatch';
import { format_music_genres } from '$lib/utils.js';

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
				if (error.data && session?.user.id) {
					await recalculateRewatchForMedium(supabase, 'games', session.user.id, error.data);
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

				if (error.data && session?.user.id) {
					await recalculateRewatchForMedium(supabase, 'movies', session.user.id, error.data);
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
						seasons: medium.seasons || null,
						episode: 0,
						notes: medium.notes || '',
						is_rewatch: false,
						rewatch_count: 1
					})
					.select()
					.single();

				if (error.data && session?.user.id) {
					await recalculateRewatchForMedium(supabase, 'shows', session.user.id, error.data);
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

				if (error.data && session?.user.id) {
					await recalculateRewatchForMedium(supabase, 'books', session.user.id, error.data);
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
			case 'music':
				error = await supabase
					.from(current_medium)
					.insert({
						user_id: session?.user.id,
						mbid: medium.mbid,
						title: medium.title,
						artist: medium.artist,
						music_type: ['album', 'ep', 'single'].includes(medium.music_type)
							? medium.music_type
							: 'album',
						image: medium.image,
						release: medium.release,
						genres: format_music_genres(medium.genres),
						averagerating: medium.averagerating ?? null,
						rating: 0,
						backlogged: medium.backlogged || 0,
						added: medium.added,
						notes: medium.notes || '',
						is_rewatch: false,
						rewatch_count: 1
					})
					.select()
					.single();
				if (error.error) {
					console.error('Music insert failed:', error.error);
					return new Response(JSON.stringify({ error: error.error.message }), { status: 500 });
				}

				if (error.data && session?.user.id) {
					await recalculateRewatchForMedium(supabase, 'music', session.user.id, error.data);
				}

				if (error.data) {
					const { error: activityError } = await supabase.from('user_activities').insert({
						user_id: session?.user.id,
						activity_type: 'add',
						media_type: current_medium,
						media_title: medium.title,
						details: {
							media_id: error.data.id,
							media_year: new Date(medium.added).getFullYear(),
							backlogged: medium.backlogged || 0,
							music_type: medium.music_type
						}
					});
					if (activityError) console.error('Music activity insert failed:', activityError);
				}
				return new Response(JSON.stringify(error));
			default:
				throw 'Switch Statement failed';
		}
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		console.error(`Error on Endpoint addMedium: ${message}`);
		return new Response(JSON.stringify({ error: message }), { status: 500 });
	}
}
