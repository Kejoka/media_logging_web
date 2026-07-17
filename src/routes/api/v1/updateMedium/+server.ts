import { validate_and_trim_field } from '$lib/utils.js';
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

		// Normalize all optional text fields before persisting to keep server-side data consistent.
		switch (current_medium) {
			case 'games':
				error = await supabase
					.from(current_medium)
					.update({
						title: validate_and_trim_field(medium_fields_to_update.title, 'Kein Titel angegeben'),
						image: validate_and_trim_field(medium_fields_to_update.image, null),
						release: validate_and_trim_field(medium_fields_to_update.release, null),
						genres: validate_and_trim_field(medium_fields_to_update.genres, null),
						platforms: validate_and_trim_field(medium_fields_to_update.platforms, null),
						...(medium_fields_to_update.trophy !== undefined
							? { trophy: medium_fields_to_update.trophy }
							: {}),
						added: validate_and_trim_field(medium_fields_to_update.added, new Date().toISOString()),
						notes: validate_and_trim_field(medium_fields_to_update.notes, null)
					})
					.eq('id', medium_fields_to_update.id);
				if (session?.user.id) {
					await recalculateRewatchForMedium(
						supabase,
						'games',
						session.user.id,
						medium_fields_to_update
					);
				}
				return new Response(JSON.stringify(error));
			case 'movies':
				error = await supabase
					.from(current_medium)
					.update({
						title: validate_and_trim_field(medium_fields_to_update.title, 'Kein Titel angegeben'),
						image: validate_and_trim_field(medium_fields_to_update.image, null),
						release: validate_and_trim_field(medium_fields_to_update.release, null),
						genres: validate_and_trim_field(medium_fields_to_update.genres, null),
						added: validate_and_trim_field(medium_fields_to_update.added, new Date().toISOString()),
						notes: validate_and_trim_field(medium_fields_to_update.notes, null)
					})
					.eq('id', medium_fields_to_update.id);
				if (session?.user.id) {
					await recalculateRewatchForMedium(
						supabase,
						'movies',
						session.user.id,
						medium_fields_to_update
					);
				}
				return new Response(JSON.stringify(error));
			case 'shows':
				error = await supabase
					.from(current_medium)
					.update({
						title: validate_and_trim_field(medium_fields_to_update.title, 'Kein Titel angegeben'),
						image: validate_and_trim_field(medium_fields_to_update.image, null),
						release: validate_and_trim_field(medium_fields_to_update.release, null),
						genres: validate_and_trim_field(medium_fields_to_update.genres, null),
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
				if (session?.user.id) {
					await recalculateRewatchForMedium(
						supabase,
						'shows',
						session.user.id,
						medium_fields_to_update
					);
				}
				return new Response(JSON.stringify(error));
			case 'books':
				error = await supabase
					.from(current_medium)
					.update({
						title: validate_and_trim_field(medium_fields_to_update.title, 'Kein Titel angegeben'),
						author: validate_and_trim_field(medium_fields_to_update.author, null),
						image: validate_and_trim_field(medium_fields_to_update.image, null),
						release: validate_and_trim_field(medium_fields_to_update.release, null),
						genres: validate_and_trim_field(medium_fields_to_update.genres, null),
						pagecount:
							medium_fields_to_update.pagecount &&
							medium_fields_to_update.pagecount.toString().trim().length > 0
								? medium_fields_to_update.pagecount
								: null,
						added: validate_and_trim_field(medium_fields_to_update.added, new Date().toISOString()),
						notes: validate_and_trim_field(medium_fields_to_update.notes, null)
					})
					.eq('id', medium_fields_to_update.id);
				if (session?.user.id) {
					await recalculateRewatchForMedium(
						supabase,
						'books',
						session.user.id,
						medium_fields_to_update
					);
				}
				return new Response(JSON.stringify(error));
			default:
				throw 'Switch Statement failed';
		}
	} catch (error) {
		console.log(`Error on Endpoint updateMedium: \n ${error}`);
		return new Response(String(error));
	}
}
