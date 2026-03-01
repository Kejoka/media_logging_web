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

/**
 * Whether current route belongs to signed-in user's own profile space
 */
export const is_own_profile = writable<boolean>(false);

/**
 * Whether current route is auth-related (/ or /auth/*)
 */
export const is_auth_page = writable<boolean>(false);

/**
 * Whether current route is /account
 */
export const is_account_page = writable<boolean>(false);

/**
 * Whether current route is a root profile page like /username
 */
export const is_profile_root_page = writable<boolean>(false);

/**
 * Username extracted from current route's first segment
 */
export const route_profile_username = writable<string | null>(null);
