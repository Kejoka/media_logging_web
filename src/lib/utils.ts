import type { mediaObject } from './dbUtils';

// Function to add delay
export function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export const MEDIA_TYPE_ORDER = ['games', 'movies', 'shows', 'books'] as const;

export type MediaType = (typeof MEDIA_TYPE_ORDER)[number];

export function isMediaType(value: string): value is MediaType {
	return MEDIA_TYPE_ORDER.includes(value as MediaType);
}

export function normalize_enabled_media_types(value?: string | null): MediaType[] {
	const raw_values = value
		?.split(',')
		.map((entry) => entry.trim())
		.filter((entry) => entry.length > 0);

	if (!raw_values || raw_values.length === 0) {
		return [...MEDIA_TYPE_ORDER];
	}

	const unique_values = Array.from(new Set(raw_values.filter((entry) => isMediaType(entry)))) as MediaType[];
	if (unique_values.length === 0) {
		return [...MEDIA_TYPE_ORDER];
	}

	return MEDIA_TYPE_ORDER.filter((type) => unique_values.includes(type));
}

export function serialize_enabled_media_types(media_types: MediaType[]): string {
	const filtered = MEDIA_TYPE_ORDER.filter((type) => media_types.includes(type));
	return filtered.join(',');
}

/**
 * Converts a medium code used in the DB/API to a German UI label.
 */
export function get_media_type_display_label(current_medium: string): string {
	switch (current_medium) {
		case 'games':
			return 'Game';
		case 'movies':
			return 'Film';
		case 'shows':
			return 'Serie';
		case 'books':
			return 'Buch';
		default:
			return 'Error';
	}
}

/**
 * Converts the numeric UI mode to the headline label shown in the app.
 */
export function get_ui_mode_label_from_code(current_mode: number) {
	switch (current_mode) {
		case 0:
			return 'Medien Log';
		case 1:
			return 'Backlog';
		case 2:
			return 'Statistiken';
		default:
			return 'ERROR';
	}
}

/**
 * Trims string inputs and applies a fallback if the value is empty.
 * Keeps validation behavior consistent between server endpoints.
 */
export function validate_and_trim_field(
	value: string | undefined | null,
	default_value: string | null
): string | null {
	if (!value) {
		return default_value;
	}
	const trimmed_value = value.trim();
	return trimmed_value.length > 0 ? trimmed_value : default_value;
}

export function getMediaCodeIndex(current_medium: string): number {
	switch (current_medium) {
		case 'games':
			return 0;
		case 'movies':
			return 1;
		case 'shows':
			return 2;
		case 'books':
			return 3;
		default:
			return -1;
	}
}

/**
 * Determines if a medium should show a repeat icon.
 * Returns true if this is not the first entry (by date) for the same external media ID.
 */
export function shouldShowRepeatIcon(
	medium: mediaObject,
	allMedia: mediaObject[],
	mediaType: string
): boolean {
	// Determine which external ID field to use based on media type
	const getExternalId = (m: mediaObject): string | number | undefined => {
		switch (mediaType) {
			case 'games':
				return m.igdbid;
			case 'movies':
			case 'shows':
				return String(m.tmdbid) + (m.seasons || 0); // Combine TMDB ID with season/episode for shows to differentiate entries
			case 'books':
				return m.gbid;
			default:
				return m.title?.toLowerCase().trim();
		}
	};

	const currentId = getExternalId(medium);
	// If no external ID, use title as fallback
	if (currentId === undefined || currentId === null) {
		return false;
	}

	// Find all entries with the same external ID
	const duplicates = allMedia.filter((m) => {
		const otherId = getExternalId(m);
		return otherId === currentId;
	});

	// If only one entry with this ID, don't show repeat icon
	if (duplicates.length <= 1) {
		return false;
	}

	// Sort by added date to find the earliest
	const sortedByDate = [...duplicates].sort((a, b) => {
		const dateA = new Date(a.added || 0).getTime();
		const dateB = new Date(b.added || 0).getTime();
		return dateA - dateB;
	});

	// Get the first entry by date
	const firstEntry = sortedByDate[0];

	// Show repeat icon if this is not the first entry
	return medium.id !== firstEntry.id;
}

/**
 * Gets information about all rewatches of a medium.
 * Returns an object with the count and list of rewatch dates (formatted as "YYYY-MM")
 */
export function getReplayInfo(
	medium: mediaObject,
	allMedia: mediaObject[],
	mediaType: string
): { count: number; dates: string[] } {
	// Determine which external ID field to use based on media type
	const getExternalId = (m: mediaObject): string | number | undefined => {
		switch (mediaType) {
			case 'games':
				return m.igdbid;
			case 'movies':
			case 'shows':
				return String(m.tmdbid) + (m.seasons || 0); // Combine TMDB ID with season/episode for shows to differentiate entries
			case 'books':
				return m.gbid;
			default:
				return m.title?.toLowerCase().trim();
		}
	};

	const currentId = getExternalId(medium);

	// If no external ID, use title as fallback
	if (currentId === undefined || currentId === null) {
		return { count: 1, dates: [] };
	}

	// Find all entries with the same external ID
	const duplicates = allMedia.filter((m) => {
		const otherId = getExternalId(m);
		return otherId === currentId;
	});

	// Sort by added date
	const sortedByDate = [...duplicates].sort((a, b) => {
		const dateA = new Date(a.added || 0).getTime();
		const dateB = new Date(b.added || 0).getTime();
		return dateA - dateB;
	});

	// Format dates as YYYY-MM (skip the first one, as that's the initial watch)
	const dates = sortedByDate.slice(1).map((m) => {
		const date = new Date(m.added || 0);
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		return `${year}-${month}`;
	});

	return { count: duplicates.length, dates };
}
