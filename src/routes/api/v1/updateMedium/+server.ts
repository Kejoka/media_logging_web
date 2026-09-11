import { format_music_genres, validate_and_trim_field } from '$lib/utils.js';
import { recalculateRewatchForMedium } from '$lib/server/rewatch';

/** @type {import('./$types').RequestHandler} */
export async function POST({ request, locals: { supabase, safeGetSession } }) {
	interface ReqBody {
		current_medium: string;
		medium_fields_to_update?: any;
		to_edit?: any;
		sync_timestamp: string;
	}
	const request_body = (await request.json()) as ReqBody;
	const current_medium = request_body.current_medium;
	const medium_fields_to_update = request_body.medium_fields_to_update ?? request_body.to_edit;
	const sync_timestamp = request_body.sync_timestamp;
	if (!medium_fields_to_update) {
		return new Response('Missing medium_fields_to_update payload', { status: 400 });
	}
	const { session } = await safeGetSession();
	let error;
	try {
		error = await supabase.from('profiles').upsert({
			id: session?.user.id,
			updated_at: sync_timestamp
		});

		// A replacement can move an entry from one title's rewatch group into another.
		// Keep the former group as well as the new group in sync.
		let previousMedium: any = null;
		if (['games', 'movies', 'shows', 'books', 'music'].includes(current_medium)) {
			const { data } = await supabase
				.from(current_medium)
				.select('*')
				.eq('id', medium_fields_to_update.id)
				.single();
			previousMedium = data;
		}
		const recalculateAffectedRewatchGroups = async (
			medium: 'games' | 'movies' | 'shows' | 'books' | 'music'
		) => {
			if (!session?.user.id) return;
			if (previousMedium) {
				await recalculateRewatchForMedium(supabase, medium, session.user.id, previousMedium);
			}
			await recalculateRewatchForMedium(supabase, medium, session.user.id, medium_fields_to_update);
		};

		// Normalize all optional text fields before persisting to keep server-side data consistent.
		switch (current_medium) {
			case 'games':
				error = await supabase
					.from(current_medium)
					.update({
						igdbid: medium_fields_to_update.igdbid ?? null,
						title: validate_and_trim_field(medium_fields_to_update.title, 'Kein Titel angegeben'),
						image: validate_and_trim_field(medium_fields_to_update.image, null),
						release: validate_and_trim_field(medium_fields_to_update.release, null),
						genres: validate_and_trim_field(medium_fields_to_update.genres, null),
						platforms: validate_and_trim_field(medium_fields_to_update.platforms, null),
						averagerating: medium_fields_to_update.averagerating ?? null,
						...(medium_fields_to_update.trophy !== undefined
							? { trophy: medium_fields_to_update.trophy }
							: {}),
						added: validate_and_trim_field(medium_fields_to_update.added, new Date().toISOString()),
						notes: validate_and_trim_field(medium_fields_to_update.notes, null)
					})
					.eq('id', medium_fields_to_update.id);
				await recalculateAffectedRewatchGroups('games');
				return new Response(JSON.stringify(error));
			case 'movies':
				error = await supabase
					.from(current_medium)
					.update({
						tmdbid: medium_fields_to_update.tmdbid ?? null,
						title: validate_and_trim_field(medium_fields_to_update.title, 'Kein Titel angegeben'),
						image: validate_and_trim_field(medium_fields_to_update.image, null),
						release: validate_and_trim_field(medium_fields_to_update.release, null),
						genres: validate_and_trim_field(medium_fields_to_update.genres, null),
						averagerating: medium_fields_to_update.averagerating ?? null,
						added: validate_and_trim_field(medium_fields_to_update.added, new Date().toISOString()),
						notes: validate_and_trim_field(medium_fields_to_update.notes, null)
					})
					.eq('id', medium_fields_to_update.id);
				await recalculateAffectedRewatchGroups('movies');
				return new Response(JSON.stringify(error));
			case 'shows':
				error = await supabase
					.from(current_medium)
					.update({
						tmdbid: medium_fields_to_update.tmdbid ?? null,
						title: validate_and_trim_field(medium_fields_to_update.title, 'Kein Titel angegeben'),
						image: validate_and_trim_field(medium_fields_to_update.image, null),
						release: validate_and_trim_field(medium_fields_to_update.release, null),
						genres: validate_and_trim_field(medium_fields_to_update.genres, null),
						averagerating: medium_fields_to_update.averagerating ?? null,
						added: validate_and_trim_field(medium_fields_to_update.added, new Date().toISOString()),
						notes: validate_and_trim_field(medium_fields_to_update.notes, null),
						seasons: validate_and_trim_field(medium_fields_to_update.seasons, null),
						episode:
							medium_fields_to_update.episode &&
							medium_fields_to_update.episode.toString().trim().length > 0
								? medium_fields_to_update.episode
								: 0
					})
					.eq('id', medium_fields_to_update.id);
				await recalculateAffectedRewatchGroups('shows');
				return new Response(JSON.stringify(error));
			case 'books':
				error = await supabase
					.from(current_medium)
					.update({
						gbid: validate_and_trim_field(medium_fields_to_update.gbid, null),
						title: validate_and_trim_field(medium_fields_to_update.title, 'Kein Titel angegeben'),
						subtitle: validate_and_trim_field(medium_fields_to_update.subtitle, null),
						author: validate_and_trim_field(medium_fields_to_update.author, null),
						image: validate_and_trim_field(medium_fields_to_update.image, null),
						release: validate_and_trim_field(medium_fields_to_update.release, null),
						genres: validate_and_trim_field(medium_fields_to_update.genres, null),
						averagerating: medium_fields_to_update.averagerating ?? null,
						pagecount:
							medium_fields_to_update.pagecount &&
							medium_fields_to_update.pagecount.toString().trim().length > 0
								? medium_fields_to_update.pagecount
								: null,
						added: validate_and_trim_field(medium_fields_to_update.added, new Date().toISOString()),
						notes: validate_and_trim_field(medium_fields_to_update.notes, null)
					})
					.eq('id', medium_fields_to_update.id);
				await recalculateAffectedRewatchGroups('books');
				return new Response(JSON.stringify(error));
			case 'music':
				error = await supabase
					.from(current_medium)
					.update({
						mbid: validate_and_trim_field(medium_fields_to_update.mbid, null),
						title: validate_and_trim_field(medium_fields_to_update.title, 'Kein Titel angegeben'),
						artist: validate_and_trim_field(medium_fields_to_update.artist, null),
						music_type: ['album', 'ep', 'single'].includes(medium_fields_to_update.music_type)
							? medium_fields_to_update.music_type
							: 'album',
						image: validate_and_trim_field(medium_fields_to_update.image, null),
						release: validate_and_trim_field(medium_fields_to_update.release, null),
						genres: format_music_genres(medium_fields_to_update.genres) ?? null,
						averagerating: medium_fields_to_update.averagerating ?? null,
						added: validate_and_trim_field(medium_fields_to_update.added, new Date().toISOString()),
						notes: validate_and_trim_field(medium_fields_to_update.notes, null)
					})
					.eq('id', medium_fields_to_update.id);
				await recalculateAffectedRewatchGroups('music');
				return new Response(JSON.stringify(error));
			default:
				throw 'Switch Statement failed';
		}
	} catch (error) {
		console.log(`Error on Endpoint updateMedium: \n ${error}`);
		return new Response(String(error));
	}
}
