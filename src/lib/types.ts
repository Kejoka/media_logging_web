/**
 * Sorting methods for media lists
 */
export type SortingMethod =
	| 'date_added_desc'
	| 'date_added_asc'
	| 'release_date_desc'
	| 'release_date_asc'
	| 'review_score_desc'
	| 'review_score_asc'
	| 'title_asc'
	| 'title_desc';

/**
 * User challenge for yearly goals per medium
 */
export type UserChallenge = {
	id?: number;
	user_id?: string;
	medium: string;
	year: number;
	challenge_type: 'count' | 'pages' | 'completion';
	label: string;
	target_count: number;
	created_at?: string;
	updated_at?: string;
};

/**
 * Predefined challenge templates
 */
export type ChallengeTemplate = {
	medium: 'games' | 'movies' | 'shows' | 'books' | 'music';
	id: string;
	label: string;
	type: 'count' | 'pages' | 'completion';
	defaultTarget: number;
	description: string;
};

/**
 * Predefined challenge templates available to users
 */
export const CHALLENGE_TEMPLATES: ChallengeTemplate[] = [
	// Games
	{
		medium: 'games',
		id: 'games_played_per_year',
		label: 'Gespielt pro Jahr',
		type: 'count',
		defaultTarget: 20,
		description: 'Wie viele Spiele möchtest du in diesem Jahr spielen?'
	},
	{
		medium: 'games',
		id: 'hundred_percent',
		label: 'Auf 100% spielen',
		type: 'completion',
		defaultTarget: 3,
		description: 'Wie viele Spiele möchtest du zu 100% abschließen?'
	},
	// Movies
	{
		medium: 'movies',
		id: 'movies_watched_per_year',
		label: 'Geschaut pro Jahr',
		type: 'count',
		defaultTarget: 20,
		description: 'Wie viele Filme möchtest du in diesem Jahr schauen?'
	},
	// Shows
	{
		medium: 'shows',
		id: 'shows_watched_per_year',
		label: 'Geschaut pro Jahr',
		type: 'count',
		defaultTarget: 20,
		description: 'Wie viele Serien möchtest du in diesem Jahr schauen?'
	},
	// Books
	{
		medium: 'books',
		id: 'books_read_per_year',
		label: 'Gelesen pro Jahr',
		type: 'count',
		defaultTarget: 20,
		description: 'Wie viele Bücher möchtest du in diesem Jahr lesen?'
	},
	{
		medium: 'books',
		id: 'pages_read',
		label: 'Seiten gelesen',
		type: 'pages',
		defaultTarget: 5000,
		description: 'Wie viele Seiten möchtest du dieses Jahr lesen?'
	},
	// Music
	{
		medium: 'music',
		id: 'music_logged_per_year',
		label: 'Veröffentlicht pro Jahr',
		type: 'count',
		defaultTarget: 20,
		description: 'Wie viele Alben, EPs oder Singles möchtest du dieses Jahr hören?'
	}
];
