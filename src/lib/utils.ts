import type { mediaObject } from './dbUtils';

// Function to add delay
export function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export const MEDIA_TYPE_ORDER = ['games', 'movies', 'shows', 'books', 'music'] as const;

export const PAGE_SIZE = 10 as const;
export const STATS_PAGE_SIZE = 50 as const;

export type MediaType = (typeof MEDIA_TYPE_ORDER)[number];

export type NotificationMediaPreferences = {
	backlog_adds: boolean;
	regular_adds: boolean;
};

export type NotificationPreferences = {
	[type in MediaType]: NotificationMediaPreferences;
};

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

	const unique_values = Array.from(
		new Set(raw_values.filter((entry) => isMediaType(entry)))
	) as MediaType[];
	if (unique_values.length === 0) {
		return [...MEDIA_TYPE_ORDER];
	}

	return MEDIA_TYPE_ORDER.filter((type) => unique_values.includes(type));
}

export function serialize_enabled_media_types(media_types: MediaType[]): string {
	const filtered = MEDIA_TYPE_ORDER.filter((type) => media_types.includes(type));
	return filtered.join(',');
}

export function normalize_notification_preferences(value: unknown): NotificationPreferences {
	let raw_value = value;

	if (typeof raw_value === 'string') {
		try {
			raw_value = JSON.parse(raw_value);
		} catch {
			raw_value = null;
		}
	}

	const raw_preferences =
		raw_value && typeof raw_value === 'object' ? (raw_value as Record<string, unknown>) : {};

	return Object.fromEntries(
		MEDIA_TYPE_ORDER.map((media_type) => {
			const raw_media_preferences = raw_preferences[media_type];
			const media_preferences =
				raw_media_preferences && typeof raw_media_preferences === 'object'
					? (raw_media_preferences as Record<string, unknown>)
					: {};

			return [
				media_type,
				{
					backlog_adds: media_preferences.backlog_adds !== false,
					regular_adds: media_preferences.regular_adds !== false
				}
			];
		})
	) as NotificationPreferences;
}

const MUSIC_GENRE_SPECIAL_CASES: Record<string, string> = {
	edm: 'EDM',
	dnb: 'DnB',
	'r&b': 'R&B',
	rnb: 'RnB',
	uk: 'UK',
	usa: 'USA'
};

/**
 * Formats MusicBrainz genres consistently for storage and display.
 * MusicBrainz commonly returns lower-case genre names such as "hip hop".
 */
export function format_music_genre(value: string): string {
	const normalized = value
		.trim()
		.replace(/[_-]+/g, ' ')
		.replace(/\s+/g, ' ')
		.toLocaleLowerCase('en-US');
	if (!normalized) return '';

	return normalized
		.split(' ')
		.map(
			(word) => MUSIC_GENRE_SPECIAL_CASES[word] || `${word.charAt(0).toUpperCase()}${word.slice(1)}`
		)
		.join(' ');
}

export function format_music_genres(value?: string | null): string | undefined {
	const formatted = (value || '')
		.split(',')
		.map(format_music_genre)
		.filter(Boolean)
		.filter((genre, index, genres) => genres.indexOf(genre) === index);
	return formatted.length > 0 ? formatted.join(', ') : undefined;
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
		case 'music':
			return 'Musik';
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
		case 'music':
			return 4;
		default:
			return -1;
	}
}

/**
 * Determines if a medium should show a repeat icon.
 * DEPRECATED: Use medium.is_rewatch field directly instead.
 * Returns true if this is not the first entry (by date) for the same external media ID.
 */
export function shouldShowRepeatIcon(
	medium: mediaObject,
	allMedia: mediaObject[],
	mediaType: string
): boolean {
	void allMedia;
	void mediaType;
	return medium.is_rewatch || false;
}

/**
 * Gets information about all rewatches of a medium.
 * DEPRECATED: Use medium.rewatch_count field directly instead.
 * Returns an object with the count and list of rewatch dates (formatted as "YYYY-MM")
 */
export function getReplayInfo(
	medium: mediaObject,
	allMedia: mediaObject[],
	mediaType: string
): { count: number; dates: string[] } {
	void allMedia;
	void mediaType;
	return { count: medium.rewatch_count || 1, dates: [] };
}
