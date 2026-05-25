import Dexie, { type EntityTable } from 'dexie';

export function getYears(media_entries: mediaObject[] | undefined, active_year: string) {
	const current_year = new Date().getFullYear();
	const safe_media_entries = media_entries ?? [];
	let unique_years = [
		...new Set(safe_media_entries.map((obj) => new Date(obj.added || 404).getFullYear()))
	].sort();
	if (unique_years.indexOf(current_year) == -1) {
		unique_years.push(current_year);
	}
	const new_year_objects = unique_years.map((value) => ({
		year: value.toString(),
		active: false
	}));
	new_year_objects.push({ year: 'Gesamt', active: false });
	if (new_year_objects.some((obj) => obj.year === active_year)) {
		new_year_objects[new_year_objects.findIndex((obj) => obj.year === active_year)].active = true;
	} else {
		new_year_objects[
			new_year_objects.findIndex((obj) => obj.year === String(current_year))
		].active = true;
	}
	return new_year_objects;
}

/**
 * Updates rewatch status for a medium in Dexie.
 * Queries all non-backlogged entries matching the unique ID and updates their rewatch status.
 * The first entry (by added date) gets is_rewatch=false, others get is_rewatch=true.
 * All get rewatch_count set to the total count.
 */
export async function updateRewatchStatus(medium_type: string, unique_id: number | undefined) {
	if (!unique_id) return;

	const store =
		medium_type === 'games'
			? dexieDB.games
			: medium_type === 'movies'
				? dexieDB.movies
				: medium_type === 'shows'
					? dexieDB.shows
					: medium_type === 'books'
						? dexieDB.books
						: null;

	if (!store) return;

	// Get all non-backlogged entries with the same unique ID
	const field = medium_type === 'games' ? 'igdbid' : medium_type === 'books' ? 'gbid' : 'tmdbid';
	const allEntries = await store
		.where(field as any)
		.equals(unique_id)
		.toArray();

	// Filter to only non-backlogged entries and sort by added date
	const nonBackloggedEntries = allEntries
		.filter((entry) => entry.backlogged === 0)
		.sort((a, b) => {
			const dateA = new Date(a.added || 0).getTime();
			const dateB = new Date(b.added || 0).getTime();
			return dateA - dateB;
		});

	if (nonBackloggedEntries.length <= 1) {
		// If only one or zero entries, mark as not rewatch
		if (nonBackloggedEntries.length === 1) {
			await store.update(nonBackloggedEntries[0].id!, {
				is_rewatch: false,
				rewatch_count: 1
			});
		}
	} else {
		// Multiple entries: first is not rewatch, rest are rewatches
		const firstId = nonBackloggedEntries[0].id!;
		const rewatchCount = nonBackloggedEntries.length;

		// Update first entry
		await store.update(firstId, {
			is_rewatch: false,
			rewatch_count: rewatchCount
		});

		// Update all other entries
		for (let i = 1; i < nonBackloggedEntries.length; i++) {
			await store.update(nonBackloggedEntries[i].id!, {
				is_rewatch: true,
				rewatch_count: rewatchCount
			});
		}
	}
}

/**
 * Maps carousel tab indices to the corresponding media table key.
 */
export function get_media_type_from_index(index: number) {
	return ['games', 'movies', 'shows', 'books'][index] || 'error';
}

/**
 * Replays offline changes from Dexie to Supabase once the client is back online.
 *
 * Important: newly created records receive a new server-side ID. We keep a local
 * mapping of old->new IDs so later queued changes for the same item target the
 * correct row on the server.
 */
export async function sync_offline_changes_to_server() {
	const changes: OfflineChangeObject[] = JSON.parse(
		(await dexieDB.prefs.toArray()).at(0)?.changed_offline || ''
	);
	const sync_timestamp = new Date();
	const failed_changes: OfflineChangeObject[] = [];
	let request_response;
	const synced_id_mappings: { old: number | undefined; new: number; medium: string }[] = [];
	for (const change of changes) {
		// Apply ID remapping for items that were created offline earlier in the queue.
		synced_id_mappings.forEach((id_mapping) => {
			if (id_mapping.medium === change.medium && id_mapping.old == change.card.id) {
				change.card.id = id_mapping.new;
			}
		});
		switch (change.event) {
			case 'add':
				try {
					request_response = await fetch('/api/v1/addMedium', {
						method: 'POST',
						body: JSON.stringify({
							last_selection: change.card,
							current_medium: change.medium,
							sync_timestamp
						}),
						headers: {
							'Content-Type': 'application/json'
						}
					});
					const supabase_response = (await request_response.json()) as { data: { id: number } };
					switch (change.medium) {
						case 'games':
							await dexieDB.games.update(change.card.id, { id: supabase_response.data.id });
							break;
						case 'movies':
							await dexieDB.movies.update(change.card.id, { id: supabase_response.data.id });
							break;
						case 'shows':
							await dexieDB.shows.update(change.card.id, { id: supabase_response.data.id });
							break;
						case 'books':
							await dexieDB.books.update(change.card.id, { id: supabase_response.data.id });
							break;
						default:
							break;
					}
					synced_id_mappings.push({
						old: change.card.id,
						new: supabase_response.data.id,
						medium: change.medium
					});
				} catch (error) {
					console.log(error);
					failed_changes.push(change);
				}
				break;
			case 'delete':
				try {
					console.log(change);
					request_response = await fetch('/api/v1/deleteMedium', {
						method: 'POST',
						body: JSON.stringify({
							medium_id: change.card.id,
							current_medium: change.medium,
							sync_timestamp
						}),
						headers: {
							'Content-Type': 'application/json'
						}
					});

					// Handle the response and sync updated entries to Dexie
					if (request_response.ok) {
						const response = (await request_response.json()) as any;
						if (response.updatedEntries && response.updatedEntries.length > 0) {
							const dexieStore =
								change.medium === 'games'
									? dexieDB.games
									: change.medium === 'movies'
										? dexieDB.movies
										: change.medium === 'shows'
											? dexieDB.shows
											: change.medium === 'books'
												? dexieDB.books
												: null;

							if (dexieStore) {
								for (const entry of response.updatedEntries) {
									await dexieStore.update(entry.id, {
										is_rewatch: entry.is_rewatch,
										rewatch_count: entry.rewatch_count
									});
								}
							}
						}
					}
				} catch (error) {
					console.log(error);
					failed_changes.push(change);
				}
				break;
			case 'update':
				try {
					request_response = await fetch('/api/v1/updateMedium', {
						method: 'POST',
						body: JSON.stringify({
							medium_fields_to_update: change.card,
							current_medium: change.medium,
							sync_timestamp
						}),
						headers: {
							'Content-Type': 'application/json'
						}
					});

					// Handle the response and sync updated entries to Dexie
					if (request_response.ok) {
						const response = (await request_response.json()) as any;
						if (response.updatedEntries && response.updatedEntries.length > 0) {
							const dexieStore =
								change.medium === 'games'
									? dexieDB.games
									: change.medium === 'movies'
										? dexieDB.movies
										: change.medium === 'shows'
											? dexieDB.shows
											: change.medium === 'books'
												? dexieDB.books
												: null;

							if (dexieStore) {
								for (const entry of response.updatedEntries) {
									await dexieStore.update(entry.id, {
										is_rewatch: entry.is_rewatch,
										rewatch_count: entry.rewatch_count
									});
								}
							}
						}
					}
				} catch (error) {
					console.log(error);
					failed_changes.push(change);
				}
				break;
			case 'score':
				try {
					request_response = await fetch('/api/v1/updateScore', {
						method: 'POST',
						body: JSON.stringify({
							score: change.card.rating,
							medium: change.card,
							current_medium: change.medium,
							sync_timestamp
						}),
						headers: {
							'Content-Type': 'application/json'
						}
					});
				} catch (error) {
					console.log(error);
					failed_changes.push(change);
				}
				break;
			case 'episode':
				try {
					request_response = await fetch('/api/v1/updateEpisode', {
						method: 'POST',
						body: JSON.stringify({
							new_value: change.card.episode,
							id: change.card.id,
							sync_timestamp
						})
					});
				} catch (error) {
					console.log(error);
					failed_changes.push(change);
				}
				break;
			case 'trophy':
				try {
					request_response = await fetch('/api/v1/updateTrophy', {
						method: 'POST',
						body: JSON.stringify({
							new_value: change.card.trophy,
							id: change.card.id,
							sync_timestamp
						})
					});
				} catch (error) {
					console.log(error);
					failed_changes.push(change);
				}
				break;
			default:
				break;
		}
	}
	await dexieDB.prefs.update(0, {
		updated_at: sync_timestamp.toISOString(),
		changed_offline: JSON.stringify(failed_changes)
	});
}

export const dexieDB = new Dexie('MediaDatabase') as Dexie & {
	games: EntityTable<mediaObject, 'id'>;
	movies: EntityTable<mediaObject, 'id'>;
	shows: EntityTable<mediaObject, 'id'>;
	books: EntityTable<mediaObject, 'id'>;
	games_other: EntityTable<mediaObject, 'id'>;
	movies_other: EntityTable<mediaObject, 'id'>;
	shows_other: EntityTable<mediaObject, 'id'>;
	books_other: EntityTable<mediaObject, 'id'>;
	prefs: EntityTable<UserInfo, 'id'>;
};

dexieDB.version(2).stores({
	games: `
    ++id,
    user_id,
    igdbid,
    title,
    image,
    release,
    genres,
    platforms,
    averagerating,
    trophy,
    added,
    rating,
    backlogged,
    is_rewatch,
    rewatch_count,
    notes
  `,
	movies: `
    ++id,
    user_id,
    tmdbid,
    title,
    image,
    release,
    genres,
    averagerating,
    added,
    rating,
    backlogged,
    is_rewatch,
    rewatch_count,
    notes
  `,
	shows: `
    ++id,
    user_id,
    tmdbid,
    title,
    image,
    release,
    genres,
    seasons,
    episode,
    averagerating,
    added,
    rating,
    backlogged,
    is_rewatch,
    rewatch_count,
    notes
  `,
	books: `
    ++id,
    user_id,
    gbid,
    title,
    subtitle,
    image,
    author,
    pagecount,
    release,
    averagerating,
    added,
    rating,
    backlogged,
    is_rewatch,
    rewatch_count,
    notes,
    genres
  `,
	games_other: `
    ++id,
    user_id,
    igdbid,
    title,
    image,
    release,
    genres,
    platforms,
    averagerating,
    trophy,
    added,
    rating,
    backlogged,
    is_rewatch,
    rewatch_count,
    notes
  `,
	movies_other: `
    ++id,
    user_id,
    tmdbid,
    title,
    image,
    release,
    genres,
    averagerating,
    added,
    rating,
    backlogged,
    is_rewatch,
    rewatch_count,
    notes
  `,
	shows_other: `
    ++id,
    user_id,
    tmdbid,
    title,
    image,
    release,
    genres,
    seasons,
    episode,
    averagerating,
    added,
    rating,
    backlogged,
    is_rewatch,
    rewatch_count,
    notes
  `,
	books_other: `
    ++id,
    user_id,
    gbid,
    title,
    subtitle,
    image,
    author,
    pagecount,
    release,
    averagerating,
    added,
    rating,
    backlogged,
    is_rewatch,
    rewatch_count,
    notes,
    genres
  `,
	prefs: `
    ++id,
    updated_at,
    deleted_offline,
    added_offline,
    updated_offline
    `
});

export type mediaObject = {
	id?: number;
	user_id?: string;
	igdbid?: number;
	tmdbid?: number;
	gbid?: number;
	title?: string;
	subtitle?: string;
	pagecount?: number;
	author?: string;
	seasons?: string;
	episode?: number;
	image?: string;
	release?: string;
	genres?: string;
	averagerating?: number;
	added?: string;
	rating?: number;
	backlogged?: number;
	platforms?: string;
	trophy?: number;
	notes?: string;
	is_rewatch?: boolean;
	rewatch_count?: number;
	// Duplicate types used to allow porting from the Flutter .db files to the new structure used in supabase and indexedDB
	averageRating?: number;
	addedIn?: number;
	pageCount?: number;
};

export type OfflineChangeObject = {
	event: string;
	medium: string;
	card: mediaObject;
};

export type MovieResult = {
	poster_path?: string;
	adult?: boolean;
	overview?: string;
	release_date?: string;
	genre_ids?: Array<number>;
	id?: number;
	media_type: 'movie';
	original_title?: string;
	original_language?: string;
	title?: string;
	backdrop_path?: string;
	popularity?: number;
	vote_count?: number;
	video?: boolean;
	vote_average?: number;
};

export type TvResult = {
	poster_path?: string;
	popularity?: number;
	id?: number;
	overview?: string;
	backdrop_path?: string;
	vote_average?: number;
	media_type: 'tv';
	first_air_date?: string;
	origin_country?: Array<string>;
	genre_ids?: Array<number>;
	original_language?: string;
	vote_count?: number;
	name?: string;
	original_name?: string;
};

export type tvSeason = {
	air_date?: string;
	episode_count?: number;
	id?: number;
	name?: string;
	poster_path?: string;
	vote_average?: number;
	season_number?: number;
};

export type UserInfo = {
	id: number;
	updated_at: string;
	changed_offline: string;
	current_user_id?: string; // Track which user's data is in Dexie
};
