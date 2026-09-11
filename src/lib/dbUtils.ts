export function getYears(
	media_entries: mediaObject[] | undefined,
	active_year: string,
	available_years?: Array<number | string>
) {
	const current_year = new Date().getFullYear();
	const safe_media_entries = media_entries ?? [];
	const source_years = available_years?.length
		? available_years.map((value) => Number(value))
		: safe_media_entries.map((obj) => new Date(obj.added || 404).getFullYear());
	let unique_years = [...new Set(source_years)].filter(Number.isFinite).sort((a, b) => a - b);
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
 * Maps carousel tab indices to the corresponding media table key.
 */
export function get_media_type_from_index(index: number) {
	return ['games', 'movies', 'shows', 'books', 'music'][index] || 'error';
}

export type mediaObject = {
	id?: number;
	user_id?: string;
	igdbid?: number;
	tmdbid?: number;
	gbid?: string;
	mbid?: string;
	music_type?: 'album' | 'ep' | 'single' | string;
	title?: string;
	subtitle?: string;
	pagecount?: number;
	author?: string;
	artist?: string;
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
	current_user_id?: string;
};
