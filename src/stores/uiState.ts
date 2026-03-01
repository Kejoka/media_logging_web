import { writable } from 'svelte/store';
import type { SortingMethod } from '$lib/types';

const is_client = typeof window !== 'undefined';

/**
 * Currently selected medium (games, movies, shows, books)
 */
export const current_medium = writable<string>(is_client ? 'movies' : 'movies');

/**
 * Currently selected year (as string, e.g., "2025")
 */
export const current_year = writable<string>(
	is_client ? String(new Date().getFullYear()) : String(new Date().getFullYear())
);

/**
 * Currently selected sorting method for media lists
 */
export const sorting_method = writable<SortingMethod>('date_added_desc');
