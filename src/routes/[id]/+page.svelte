<script lang="ts">
	import CardList from '$lib/UI/Cards/cardList.svelte';
	import YearBar from '$lib/UI/yearBar.svelte';
	import {
		dexieDB,
		getYears,
		sync_offline_changes_to_server,
		type mediaObject,
		type OfflineChangeObject,
		type tvSeason
	} from '$lib/dbUtils.js';
	import WheelDatePicker from '$lib/UI/WheelDatePicker.svelte';
	import { onMount, tick } from 'svelte';
	import { get } from 'svelte/store';
	import { online_status } from '../../stores/onlineStatus';
	import {
		current_medium as current_medium_store,
		current_year as current_year_store,
		enabled_media_types,
		sorting_method as sorting_method_store
	} from '../../stores/uiState';
	import Fuse, { type IFuseOptions } from 'fuse.js';
	import {
		MEDIA_TYPE_ORDER,
		type MediaType,
		getMediaCodeIndex,
		get_media_type_display_label,
		get_ui_mode_label_from_code
	} from '$lib/utils';
	import type { SortingMethod, UserChallenge } from '$lib/types';
	import MediaSelectionBar from '$lib/UI/mediaSelectionBar.svelte';
	import ModeSelectionBar from '$lib/UI/modeSelectionBar.svelte';
	export let data;
	let {
		session,
		profile,
		user_id,
		games,
		movies,
		shows,
		books,
		challenges = [],
		mediaId,
		mediaType,
		mediaYear
	} = data;
	let mode: string | null = (data as { mode?: string | null }).mode ?? null;
	$: is_online = $online_status;
	$: ({
		session,
		profile,
		user_id,
		games,
		movies,
		shows,
		books,
		challenges = [],
		mediaId,
		mediaType,
		mediaYear
	} = data);
	$: mode = (data as { mode?: string | null }).mode ?? null;
	// HTML bind variables
	let date_modal: HTMLInputElement;
	let search_modal: HTMLInputElement;
	let backlog_modal: HTMLInputElement;
	let season_select_modal: HTMLInputElement;
	let carousel: HTMLElement;
	let backlog_button_1: HTMLButtonElement;
	let backlog_button_2: HTMLButtonElement;
	let backlog_button_3: HTMLButtonElement;
	let add_button: HTMLButtonElement;
	// State variables
	const own_profile = profile.id == user_id;
	let current_medium = get(current_medium_store) as MediaType;
	let current_tab_index = 1;
	let active_media_types: MediaType[] = [...MEDIA_TYPE_ORDER];
	let current_year = get(current_year_store);
	let current_mode = 0;
	let sorting_method: SortingMethod = get(sorting_method_store);
	let current_suggestions: mediaObject[] = [];
	let current_season_suggestions: tvSeason[] = [];
	let challenge_data: UserChallenge[] = challenges;
	let last_selection: mediaObject = {} as mediaObject;
	let selected_date = new Date();
	let search_val: string;
	let search_author = '';
	let form_text: string = get_media_type_display_label(current_medium);
	let loading = false;
	let last_search_page = 1;
	// Media data variables
	let total_media_data: mediaObject[][] = [];
	let years_in_db: { year: string; active: boolean }[] = [];
	let media_data: mediaObject[][] = [[], [], [], []];
	let media_data_unfiltered: mediaObject[][] = [];
	let backlog_matches: mediaObject[];
	// Misc variables
	let header_text = get_ui_mode_label_from_code(current_mode);
	let input_timeout = setTimeout(function () {}, 0);
	let is_initializing = true;
	$: active_media_types = own_profile
		? $enabled_media_types.length > 0
			? $enabled_media_types
			: [...MEDIA_TYPE_ORDER]
		: [...MEDIA_TYPE_ORDER];
	$: if (!active_media_types.includes(current_medium)) {
		current_medium = active_media_types[0] ?? 'movies';
	}
	$: current_tab_index = Math.max(
		active_media_types.findIndex((type) => type === current_medium),
		0
	);
	$: current_medium_store.set(current_medium);
	$: current_year_store.set(current_year);
	$: sorting_method_store.set(sorting_method);
	const fuse_options: IFuseOptions<mediaObject> = {
		keys: ['title'],
		isCaseSensitive: false,
		minMatchCharLength: 3
	};

	function getDateTimestamp(dateValue?: string): number {
		if (!dateValue) {
			return Number.NEGATIVE_INFINITY;
		}
		const timestamp = new Date(dateValue).getTime();
		return Number.isNaN(timestamp) ? Number.NEGATIVE_INFINITY : timestamp;
	}

	// Helper to get tab index from media type
	function getTabIndexFromMediaType(type: string | null): number {
		if (!type) {
			return 0;
		}
		const dynamic_index = active_media_types.findIndex((media_type) => media_type === type);
		if (dynamic_index >= 0) {
			return dynamic_index;
		}
		return Math.max(
			active_media_types.findIndex((media_type) => media_type === 'movies'),
			0
		);
	}

	// Helper to scroll to and expand a media card
	async function scrollToAndExpandCard(mediaId: string | number, mediaType: string | null) {
		// Wait for DOM to be ready
		await tick();

		// Find the card in the media data
		const data_index = getMediaCodeIndex(mediaType || 'movies');
		let card: mediaObject | undefined = media_data[data_index]?.find(
			(m) => String(m.id) === String(mediaId)
		);

		if (!card) return;

		// Select the card (trigger expansion)
		last_selection = card;

		// Wait a bit for DOM to update
		await tick();

		// Get the suffix for the media type
		const suffixMap: Record<string, string> = {
			games: '_g',
			movies: '_m',
			shows: '_s',
			books: '_b'
		};
		const suffix = suffixMap[mediaType || 'movies'] || '_m';

		// Find and expand the card by checking its radio button
		const cardElement = document.getElementById(String(mediaId) + suffix);
		if (cardElement instanceof HTMLInputElement) {
			cardElement.checked = true;
		}

		// Scroll the card into view
		const cardWrapper = document.querySelector(`[data-media-id="${mediaId}"]`);
		if (cardWrapper) {
			cardWrapper.scrollIntoView({ behavior: 'smooth', block: 'center' });
		} else {
			// Fallback: try to find the card by ID
			const element = document.getElementById(String(mediaId) + suffix)?.closest('.px-2');
			if (element) {
				element.scrollIntoView({ behavior: 'smooth', block: 'center' });
			}
		}
	}

	function compareMedia(a: mediaObject, b: mediaObject, method: SortingMethod): number {
		switch (method) {
			case 'date_added_asc':
				return getDateTimestamp(a.added) - getDateTimestamp(b.added);
			case 'date_added_desc':
				return getDateTimestamp(b.added) - getDateTimestamp(a.added);
			case 'release_date_asc':
				return getDateTimestamp(a.release) - getDateTimestamp(b.release);
			case 'release_date_desc':
				return getDateTimestamp(b.release) - getDateTimestamp(a.release);
			case 'review_score_asc':
				return (a.rating || 0) - (b.rating || 0);
			case 'review_score_desc':
				return (b.rating || 0) - (a.rating || 0);
			case 'title_desc':
				return (b.title || '').localeCompare(a.title || '', 'de', { sensitivity: 'base' });
			case 'title_asc':
			default:
				return (a.title || '').localeCompare(b.title || '', 'de', { sensitivity: 'base' });
		}
	}

	function sortMediaList(list: mediaObject[]): mediaObject[] {
		return [...list].sort((a, b) => compareMedia(a, b, sorting_method));
	}

	function applySortingToVisibleData() {
		for (let index = 0; index < media_data.length; index += 1) {
			media_data[index] = sortMediaList(media_data[index]);
		}
		for (let index = 0; index < media_data_unfiltered.length; index += 1) {
			media_data_unfiltered[index] = sortMediaList(media_data_unfiltered[index]);
		}
	}

	// Load data and set up inital states depending on online status and sync status
	onMount(async () => {
		is_initializing = true;
		const parsed_mode = Number(mode);
		if (Number.isInteger(parsed_mode) && parsed_mode >= 0 && parsed_mode <= 2) {
			current_mode = parsed_mode;
			header_text = get_ui_mode_label_from_code(current_mode);
			if (current_mode === 1) {
				current_year = 'Gesamt';
			}
		}
		const fallback_medium = active_media_types.includes('movies')
			? 'movies'
			: (active_media_types[0] ?? 'movies');
		const medium_from_notification = mediaType as MediaType | null;
		if (medium_from_notification && active_media_types.includes(medium_from_notification)) {
			current_medium = medium_from_notification;
		} else {
			current_medium = fallback_medium;
		}
		current_tab_index = getTabIndexFromMediaType(current_medium);
		// If year is provided from notification, use it
		if (mediaYear && current_mode !== 1) {
			current_year = String(mediaYear);
		}
		form_text = get_media_type_display_label(current_medium);
		const initial_backlogged_filter = current_mode === 1 ? 1 : 0;

		// Check if user has changed - if so, clear all Dexie tables
		const existingPrefs = await dexieDB.prefs.toArray();
		if (existingPrefs.length > 0 && existingPrefs[0].current_user_id !== user_id) {
			console.log('USER CHANGED - CLEARING DEXIE DB');
			// Clear all tables
			await dexieDB.games.clear();
			await dexieDB.movies.clear();
			await dexieDB.shows.clear();
			await dexieDB.books.clear();
			await dexieDB.games_other.clear();
			await dexieDB.movies_other.clear();
			await dexieDB.shows_other.clear();
			await dexieDB.books_other.clear();
			await dexieDB.prefs.clear();
		}

		// If user is online
		if (is_online) {
			if (!own_profile) {
				await cloneSupabase(true);
			} else {
				// Online and no DexieDB yet
				if ((await dexieDB.prefs.toArray()).length == 0) {
					await dexieDB.prefs.add({
						id: 0,
						updated_at: new Date(profile.updated_at).toISOString(),
						changed_offline: '[]',
						current_user_id: user_id
					});
					await cloneSupabase(false);
				} else {
					// Online, not in sync, dexie most recent
					if (
						new Date((await dexieDB.prefs.toArray())[0].updated_at) > new Date(profile.updated_at)
					) {
						console.log('NOT IN SYNC, NEW CHANGES IN DEXIE');
						await sync_offline_changes_to_server();
					}
					// Online, not in sync, supabase most recent
					else if (
						new Date((await dexieDB.prefs.toArray())[0].updated_at) < new Date(profile.updated_at)
					) {
						console.log('NOT IN SYNC, NEW CHANGES IN SUPABASE');
						await cloneSupabase(false);
						await dexieDB.prefs.update(0, {
							updated_at: new Date(profile.updated_at).toISOString(),
							current_user_id: user_id
						});
					}
				}
			}
		}
		// If user is offline
		else {
			// Unlikely state that ensures supabase will be clones next time the user is online
			if ((await dexieDB.prefs.toArray()).length == 0) {
				await dexieDB.prefs.add({
					id: 0,
					updated_at: new Date('01.01.2000').toISOString(),
					changed_offline: '[]',
					current_user_id: user_id
				});
			}
		}
		// Handle data from visited user profile
		if (!own_profile) {
			total_media_data.push(
				await dexieDB.games_other
					.where({ backlogged: initial_backlogged_filter })
					.reverse()
					.sortBy('added')
			);
			total_media_data.push(
				await dexieDB.movies_other
					.where({ backlogged: initial_backlogged_filter })
					.reverse()
					.sortBy('added')
			);
			total_media_data.push(
				await dexieDB.shows_other
					.where({ backlogged: initial_backlogged_filter })
					.reverse()
					.sortBy('added')
			);
			total_media_data.push(
				await dexieDB.books_other
					.where({ backlogged: initial_backlogged_filter })
					.reverse()
					.sortBy('added')
			);
		}
		// Handle own data
		else {
			total_media_data.push(
				await dexieDB.games
					.where({ backlogged: initial_backlogged_filter })
					.reverse()
					.sortBy('added')
			);
			total_media_data.push(
				await dexieDB.movies
					.where({ backlogged: initial_backlogged_filter })
					.reverse()
					.sortBy('added')
			);
			total_media_data.push(
				await dexieDB.shows
					.where({ backlogged: initial_backlogged_filter })
					.reverse()
					.sortBy('added')
			);
			total_media_data.push(
				await dexieDB.books
					.where({ backlogged: initial_backlogged_filter })
					.reverse()
					.sortBy('added')
			);
		}
		if (current_mode === 1) {
			current_year = 'Gesamt';
			for (let [index, media] of total_media_data.entries()) {
				media_data[index] = media;
			}
		} else if (isNaN(Number(current_year))) {
			for (let [index, media] of total_media_data.entries()) {
				media_data[index] = media;
			}
		} else {
			for (let [index, media] of total_media_data.entries()) {
				media_data[index] = media.filter((obj) => obj.added?.substring(0, 4) == current_year);
			}
		}
		for (let media of media_data) {
			media_data_unfiltered.push(media);
		}
		applySortingToVisibleData();
		challenge_data = challenges;
		years_in_db = getYears(total_media_data[getMediaCodeIndex(current_medium)], current_year);
		if (current_mode === 1) {
			years_in_db = years_in_db.slice(-1);
		}

		// Ensure current_user_id is stored in prefs for next login detection
		const prefs = await dexieDB.prefs.toArray();
		if (prefs.length > 0) {
			await dexieDB.prefs.update(0, { current_user_id: user_id });
		}

		await tick();
		requestAnimationFrame(() => {
			if (!carousel) {
				return;
			}
			carousel.scrollLeft = carousel.clientWidth * current_tab_index;

			// If mediaId is provided, scroll to and expand the card
			if (mediaId && mediaType) {
				void scrollToAndExpandCard(mediaId, mediaType);
			}

			setTimeout(() => {
				is_initializing = false;
			}, 100);
		});
	});

	// Clones supabase contents depending on whether or not the user is on their own profile
	async function cloneSupabase(other: boolean) {
		if (!other) {
			if ((await dexieDB.games.toArray()).length != games.data?.length) {
				await dexieDB.games.clear();
				await dexieDB.games.bulkAdd(games.data || []);
			}
			if ((await dexieDB.movies.toArray()).length != movies.data?.length) {
				await dexieDB.movies.clear();
				await dexieDB.movies.bulkAdd(movies.data || []);
			}
			if ((await dexieDB.shows.toArray()).length != shows.data?.length) {
				await dexieDB.shows.clear();
				await dexieDB.shows.bulkAdd(shows.data || []);
			}
			if ((await dexieDB.books.toArray()).length != books.data?.length) {
				await dexieDB.books.clear();
				await dexieDB.books.bulkAdd(books.data || []);
			}
		} else {
			if ((await dexieDB.games_other.toArray()).length != games.data?.length) {
				await dexieDB.games_other.clear();
				await dexieDB.games_other.bulkAdd(games.data || []);
			}
			if ((await dexieDB.movies_other.toArray()).length != movies.data?.length) {
				await dexieDB.movies_other.clear();
				await dexieDB.movies_other.bulkAdd(movies.data || []);
			}
			if ((await dexieDB.shows_other.toArray()).length != shows.data?.length) {
				await dexieDB.shows_other.clear();
				await dexieDB.shows_other.bulkAdd(shows.data || []);
			}
			if ((await dexieDB.books_other.toArray()).length != books.data?.length) {
				await dexieDB.books_other.clear();
				await dexieDB.books_other.bulkAdd(books.data || []);
			}
		}
	}
	// Handles the switches between games, movies, shows and books
	async function handleMediaSwitch(event: any) {
		clearTimeout(input_timeout);
		input_timeout = setTimeout(() => {
			if (is_initializing) {
				return;
			}
			if (!carousel) {
				return;
			}
			if (event.type == 'scroll') {
				if (carousel.clientWidth === 0) {
					return;
				}
				const index = Math.round(carousel.scrollLeft / carousel.clientWidth);
				if (index < 0 || index >= active_media_types.length) {
					return;
				}
				current_tab_index = index;
				current_medium = active_media_types[index] ?? active_media_types[0] ?? 'movies';
			} else {
				const medium_to_select =
					event?.medium ??
					event?.detail?.medium ??
					active_media_types[current_tab_index] ??
					active_media_types[0];
				if (!active_media_types.includes(medium_to_select)) {
					return;
				}
				current_medium = medium_to_select;
				current_tab_index = getTabIndexFromMediaType(medium_to_select);
				carousel.scrollLeft = current_tab_index * carousel.clientWidth;
			}
			// YearBar Data
			if (current_mode != 1) {
				years_in_db = getYears(total_media_data[getMediaCodeIndex(current_medium)], current_year);
				current_year =
					years_in_db.find((obj) => obj.active == true)?.year || String(new Date().getFullYear());
			} else {
				years_in_db = years_in_db.slice(-1);
			}
			form_text = get_media_type_display_label(current_medium);
			// Year Filter
			if (isNaN(Number(current_year))) {
				for (let [index, media] of total_media_data.entries()) {
					media_data[index] = media;
				}
			} else {
				for (let [index, media] of total_media_data.entries()) {
					media_data[index] = media.filter((obj) => obj.added?.substring(0, 4) == current_year);
				}
			}
			for (let [index, media] of media_data.entries()) {
				media_data_unfiltered[index] = media;
			}
			applySortingToVisibleData();
		}, 20);
	}
	// Handle the switch between the modes Media-Log, Backlog and Stats
	async function handleModeSwitch(event: any) {
		current_mode = event.mode;
		header_text = get_ui_mode_label_from_code(current_mode);
		if (current_mode != 1) {
			await refreshCardList(new Date().getFullYear().toString());
		} else {
			await refreshCardList('Gesamt');
			years_in_db = years_in_db.slice(-1);
		}
	}
	// HAndle the switch between individual years
	async function handleYearSwitch(event: any) {
		const year = event.year.year;
		let new_data;

		if (isNaN(year)) {
			for (let [index, media] of total_media_data.entries()) {
				media_data[index] = media;
			}
		} else {
			for (let [index, media] of total_media_data.entries()) {
				media_data[index] = media.filter((obj) => obj.added?.substring(0, 4) == year);
			}
		}
		for (let [index, media] of media_data.entries()) {
			media_data_unfiltered[index] = media;
		}
		current_year = year;
		applySortingToVisibleData();
	}
	// Refreshes the current card list to visualize recent changes
	async function refreshCardList(set_year: string) {
		if (!own_profile) {
			total_media_data[0] = await dexieDB.games_other
				.where({ backlogged: current_mode == 1 ? 1 : 0 })
				.reverse()
				.sortBy('added');
			total_media_data[1] = await dexieDB.movies_other
				.where({ backlogged: current_mode == 1 ? 1 : 0 })
				.reverse()
				.sortBy('added');
			total_media_data[2] = await dexieDB.shows_other
				.where({ backlogged: current_mode == 1 ? 1 : 0 })
				.reverse()
				.sortBy('added');
			total_media_data[3] = await dexieDB.books_other
				.where({ backlogged: current_mode == 1 ? 1 : 0 })
				.reverse()
				.sortBy('added');
		} else {
			total_media_data[0] = await dexieDB.games
				.where({ backlogged: current_mode == 1 ? 1 : 0 })
				.reverse()
				.sortBy('added');
			total_media_data[1] = await dexieDB.movies
				.where({ backlogged: current_mode == 1 ? 1 : 0 })
				.reverse()
				.sortBy('added');
			total_media_data[2] = await dexieDB.shows
				.where({ backlogged: current_mode == 1 ? 1 : 0 })
				.reverse()
				.sortBy('added');
			total_media_data[3] = await dexieDB.books
				.where({ backlogged: current_mode == 1 ? 1 : 0 })
				.reverse()
				.sortBy('added');
		}
		years_in_db = getYears(total_media_data[getMediaCodeIndex(current_medium)], set_year);
		current_year =
			years_in_db.find((obj) => obj.active == true)?.year || String(new Date().getFullYear());

		if (isNaN(Number(current_year))) {
			for (let [index, media] of total_media_data.entries()) {
				media_data[index] = media;
			}
		} else {
			for (let [index, media] of total_media_data.entries()) {
				media_data[index] = media.filter((obj) => obj.added?.substring(0, 4) == current_year);
			}
		}
		for (let [index, media] of media_data.entries()) {
			media_data_unfiltered[index] = media;
		}
		applySortingToVisibleData();
	}
	// Handles input changes in the add medium form
	function handleInput() {
		if (!is_online) {
			current_suggestions = [{ title: search_val, release: new Date().toISOString() }];
			return;
		}
		loading = true;
		current_suggestions = [];
		last_search_page = 1;
		clearTimeout(input_timeout);
		input_timeout = setTimeout(async () => {
			const res = await fetch('/api/v1/getSearchSuggestions', {
				method: 'POST',
				body: JSON.stringify({ search_val, search_author, last_search_page, current_medium }),
				headers: {
					'Content-Type': 'application/json'
				}
			});
			loading = false;
			current_suggestions = await res.json();
		}, 1000);
	}
	// Handles input changes in the search bar filter
	async function handleFilter(detail: { value: string }) {
		if (detail.value.trim().length == 0) {
			media_data = media_data_unfiltered.map((list) => [...list]);
		} else {
			let fuses: Fuse<mediaObject>[] = [];
			for (let media of media_data_unfiltered) {
				fuses.push(new Fuse(media, fuse_options));
			}
			for (let [index, _] of media_data.entries()) {
				media_data[index] = fuses[index]
					.search(detail.value.trim())
					.map((res) => res.item) as mediaObject[];
			}
		}
		for (let index = 0; index < media_data.length; index += 1) {
			media_data[index] = sortMediaList(media_data[index]);
		}
	}

	function handleChallengeUpdated(event: CustomEvent) {
		const challenge = event.detail as UserChallenge;
		const existingIndex = challenge_data.findIndex(
			(item) =>
				(item.id && challenge.id && item.id === challenge.id) ||
				(item.medium === challenge.medium &&
					item.year === challenge.year &&
					item.challenge_type === challenge.challenge_type)
		);
		if (existingIndex >= 0) {
			challenge_data[existingIndex] = challenge;
			challenge_data = [...challenge_data];
		} else {
			challenge_data = [...challenge_data, challenge];
		}
	}

	function handleChallengeDeleted(event: CustomEvent) {
		const challenge = event.detail as UserChallenge;
		const index = challenge_data.findIndex(
			(item) =>
				item.medium === challenge.medium &&
				item.year === challenge.year &&
				item.challenge_type === challenge.challenge_type
		);
		if (index >= 0) {
			challenge_data.splice(index, 1);
			challenge_data = [...challenge_data];
		}
	}

	function handleSortingMethodChange(detail: { method: SortingMethod }) {
		sorting_method = detail.method;
		applySortingToVisibleData();
	}
	// Handles reaching the end of the current suggestions and lazy loads more suggestions
	async function handleSuggestionScroll(e: Event) {
		const scrollTop = (e.target as HTMLElement).scrollTop;
		const scrollHeight = (e.target as HTMLElement).scrollHeight;
		const clientHeight = (e.target as HTMLElement).clientHeight;
		const scroll_progress = scrollTop / (scrollHeight - clientHeight);
		if (scroll_progress == 1 && !loading && last_search_page != -1) {
			loading = true;
			last_search_page += 1;
			const res = await fetch('/api/v1/getSearchSuggestions', {
				method: 'POST',
				body: JSON.stringify({ search_val, search_author, last_search_page, current_medium }),
				headers: {
					'Content-Type': 'application/json'
				}
			});
			const json_res = (await res.json()) as mediaObject[];
			if (json_res.length != 0) {
				current_suggestions = [...current_suggestions, ...json_res];
			} else {
				last_search_page = -1;
			}
			loading = false;
		}
	}
	// Checks if an item that is about to be added already exists in the backlog
	async function checkBacklog() {
		// Check for item in Backlog
		switch (current_medium) {
			case 'games':
				backlog_matches = await dexieDB.games
					.filter((medium) => medium.title === last_selection.title && medium.backlogged == 1)
					.toArray();
				break;
			case 'movies':
				backlog_matches = await dexieDB.movies
					.filter((medium) => medium.title === last_selection.title && medium.backlogged == 1)
					.toArray();
				break;
			case 'shows':
				backlog_matches = await dexieDB.shows
					.filter((medium) => medium.title === last_selection.title && medium.backlogged == 1)
					.toArray();
				break;
			case 'books':
				backlog_matches = await dexieDB.books
					.filter((medium) => medium.title === last_selection.title && medium.backlogged == 1)
					.toArray();
				break;
			default:
				break;
		}
		if (backlog_matches.length != 0) {
			backlog_modal.checked = true;
		} else {
			addMedium(2);
		}
	}

	/**
	 * @param backlog_event
	 * 0 == remove from backlog and transfer reviews
	 * 1 == remove from backlog and discard reviews
	 * 2 == keep in backlog
	 */
	async function addMedium(backlog_event: number) {
		backlog_modal.checked = false;
		season_select_modal.checked = false;
		last_selection.added = selected_date.toISOString();
		last_selection.backlogged = current_mode;
		const sync_timestamp = new Date();
		// Handle Backlog Events
		let backlog_reviews: string = '';
		if (backlog_event in [0, 1]) {
			for (let backlog_match of backlog_matches) {
				// Merge Backlog Reviews
				if (backlog_match.notes) {
					backlog_reviews += backlog_match.notes + '\n';
				}
				//DexieDB
				switch (current_medium) {
					case 'games':
						dexieDB.games.delete(backlog_match.id);
						break;
					case 'movies':
						dexieDB.movies.delete(backlog_match.id);
						break;
					case 'shows':
						dexieDB.shows.delete(backlog_match.id);
						break;
					case 'books':
						dexieDB.books.delete(backlog_match.id);
						break;
					default:
						console.log('Error deleting DexieDB Entry');
						break;
				}
				//Supabase
				try {
					const res = await fetch('/api/v1/deleteMedium', {
						method: 'POST',
						body: JSON.stringify({
							medium_id: backlog_match.id,
							current_medium,
							sync_timestamp
						}),
						headers: {
							'Content-Type': 'application/json'
						}
					});
				} catch (error) {
					console.log(error);
					let dexie_prefs = (await dexieDB.prefs.toArray()).at(0);
					if (dexie_prefs) {
						if (!is_online) {
							const tmp: OfflineChangeObject[] = JSON.parse(dexie_prefs.changed_offline);
							tmp.push({
								event: 'delete',
								medium: current_medium,
								card: { id: backlog_match.id } as mediaObject
							});
							dexie_prefs.changed_offline = JSON.stringify(tmp);
						}
						dexie_prefs.updated_at = sync_timestamp.toISOString();
						await dexieDB.prefs.update(0, dexie_prefs);
					}
				}
			}
		}
		if (backlog_event == 0 && backlog_reviews.length != 0) {
			last_selection.notes = backlog_reviews.substring(0, backlog_reviews.length - 1);
		}
		// Supabase
		try {
			const dexie_prefs = (await dexieDB.prefs.toArray()).at(0);
			if (JSON.parse(dexie_prefs?.changed_offline || '').length != 0) {
				sync_offline_changes_to_server();
			}
			const res = await fetch('/api/v1/addMedium', {
				method: 'POST',
				body: JSON.stringify({
					last_selection,
					current_medium,
					sync_timestamp
				}),
				headers: {
					'Content-Type': 'application/json'
				}
			});
			const json = (await res.json()) as { data?: { id?: number } };
			last_selection.id = json.data?.id;
		} catch (error) {
			console.log(error);
		}
		// DexieDB
		last_selection.rating = 0;
		switch (current_medium) {
			case 'games':
				last_selection.averagerating = Number(
					((last_selection.averagerating || 0) / 10).toFixed(1)
				);
				last_selection.trophy = 0;
				await dexieDB.games.add(last_selection);
				break;
			case 'movies':
				last_selection.averagerating = Number((last_selection.averagerating || 0).toFixed(1));
				await dexieDB.movies.add(last_selection);
				break;
			case 'shows':
				last_selection.averagerating = Number((last_selection.averagerating || 0).toFixed(1));
				last_selection.episode = 0;
				await dexieDB.shows.add(last_selection);
				break;
			case 'books':
				await dexieDB.books.add(last_selection);
				break;
			default:
				console.log('DexieDB Error');
				break;
		}
		let dexie_prefs = (await dexieDB.prefs.toArray()).at(0);
		if (dexie_prefs) {
			if (!is_online) {
				const tmp: OfflineChangeObject[] = JSON.parse(dexie_prefs.changed_offline);
				tmp.push({ event: 'add', medium: current_medium, card: last_selection });
				dexie_prefs.changed_offline = JSON.stringify(tmp);
			}
			dexie_prefs.updated_at = sync_timestamp.toISOString();
			await dexieDB.prefs.update(0, dexie_prefs);
		}
		if (current_mode == 0) {
			await refreshCardList(selected_date.getFullYear().toString());
		} else {
			await refreshCardList('Gesamt');
			years_in_db = years_in_db.slice(-1);
		}
		date_modal.checked = false;
		search_modal.checked = false;
		add_button.disabled = false;
		backlog_button_1.disabled = false;
		backlog_button_2.disabled = false;
		backlog_button_3.disabled = false;
	}

	async function deleteMedium(event: any) {
		const medium_id = event.detail.id;
		const sync_timestamp = new Date();
		const collapse_input = document.getElementById(
			String(medium_id) + `_${current_medium.charAt(0)}`
		);
		if (collapse_input != null && collapse_input instanceof HTMLInputElement) {
			collapse_input.checked = !collapse_input.checked;
		}
		//DexieDB
		switch (current_medium) {
			case 'games':
				dexieDB.games.delete(medium_id);
				break;
			case 'movies':
				dexieDB.movies.delete(medium_id);
				break;
			case 'shows':
				dexieDB.shows.delete(medium_id);
				break;
			case 'books':
				dexieDB.books.delete(medium_id);
				break;
			default:
				console.log('Error deleting DexieDB Entry');
				break;
		}
		await dexieDB.prefs.update(0, { updated_at: sync_timestamp.toISOString() });
		//Supabase
		try {
			const dexie_prefs = (await dexieDB.prefs.toArray()).at(0);
			if (JSON.parse(dexie_prefs?.changed_offline || '').length != 0) {
				sync_offline_changes_to_server();
			}
			const res = await fetch('/api/v1/deleteMedium', {
				method: 'POST',
				body: JSON.stringify({ medium_id, current_medium, sync_timestamp }),
				headers: {
					'Content-Type': 'application/json'
				}
			});
		} catch (error) {
			console.log(error);
			let dexie_prefs = (await dexieDB.prefs.toArray()).at(0);
			if (dexie_prefs) {
				if (!is_online) {
					const tmp: OfflineChangeObject[] = JSON.parse(dexie_prefs.changed_offline);
					tmp.push({
						event: 'delete',
						medium: current_medium,
						card: { id: medium_id } as mediaObject
					});
					dexie_prefs.changed_offline = JSON.stringify(tmp);
				}
				dexie_prefs.updated_at = sync_timestamp.toISOString();
				await dexieDB.prefs.update(0, dexie_prefs);
			}
		}
		if (current_mode == 0) {
			await refreshCardList(current_year);
		} else {
			await refreshCardList('Gesamt');
			years_in_db = years_in_db.slice(-1);
		}
	}
</script>

<svelte:head>
	<title>Media-Logging</title>
</svelte:head>
<div class="flex h-full flex-col">
	<nav class="sticky top-0 right-0 left-0 z-10">
		<ModeSelectionBar {current_mode} onSwitchMode={handleModeSwitch} />
		<MediaSelectionBar
			onSwitchMedium={handleMediaSwitch}
			onFilter={handleFilter}
			onSortChange={handleSortingMethodChange}
			{current_medium}
			{active_media_types}
			{sorting_method}
			{current_mode}
		></MediaSelectionBar>
	</nav>
	<div class="relative min-h-0 flex-1 overflow-y-hidden">
		<!-- Mode and Media Mode Tabs -->
		<!-- Entries -->
		<div
			bind:this={carousel}
			onscroll={handleMediaSwitch}
			class="carousel h-full w-full overflow-y-auto"
		>
			{#each active_media_types as media_type}
				<div class="carousel-item w-full">
					<CardList
						{own_profile}
						media_data={media_data[getMediaCodeIndex(media_type)]}
						current_medium={media_type}
						{current_year}
						{sorting_method}
						challenges={challenge_data}
						{current_mode}
						on:delete={deleteMedium}
						on:refresh={() => refreshCardList(current_year)}
						on:challenge_updated={handleChallengeUpdated}
						on:challenge_deleted={handleChallengeDeleted}
						on:swipe={handleMediaSwitch}
					></CardList>
				</div>
			{/each}
		</div>
		<!-- Modals from here on -->
		<!-- SearchModal -->
		<input type="checkbox" id="search_modal" class="modal-toggle" bind:this={search_modal} />
		<div class="modal" role="dialog">
			<div class="modal-box">
				{#if is_online}
					<p class=" mb-3 text-center text-lg font-bold">{form_text} hinzufügen</p>
				{:else}
					<p class=" mb-3 text-center text-xl font-bold">Offline Modus</p>
					<p class=" mb-3 text-center text-lg font-bold">Titel manuell hinzufügen</p>
				{/if}
				<label class="mb-3 flex items-center gap-2">
					<input
						type="text"
						class="ml-input"
						placeholder="Suche"
						bind:value={search_val}
						oninput={handleInput}
					/>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 16 16"
						fill="currentColor"
						class="mr-5 -ml-10 h-4 w-4 opacity-70"
					>
						<path
							fill-rule="evenodd"
							d="M9.965 11.026a5 5 0 1 1 1.06-1.06l2.755 2.754a.75.75 0 1 1-1.06 1.06l-2.755-2.754ZM10.5 7a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z"
							clip-rule="evenodd"
						/>
					</svg>
				</label>
				{#if current_medium === 'books'}
					<label class="mb-3 block">
						<input
							type="text"
							class="ml-input"
							placeholder="Autor (optional)"
							bind:value={search_author}
							oninput={handleInput}
						/>
					</label>
				{/if}
				<div class="scrollbar-hide max-h-[50vh] overflow-y-auto" onscroll={handleSuggestionScroll}>
					{#each current_suggestions as suggestion}
						<button
							class="btn mb-3 h-fit w-full py-2"
							onclick={async () => {
								last_selection = suggestion;
								if (current_mode == 0 && current_medium != 'shows') {
									date_modal.checked = true;
								} else if (current_medium == 'shows') {
									const res = await fetch('/api/v1/getSeasonDetails', {
										method: 'POST',
										body: JSON.stringify({ id: suggestion.tmdbid }),
										headers: {
											'Content-Type': 'application/json'
										}
									});
									current_season_suggestions = await res.json();
									season_select_modal.checked = true;
								} else {
									addMedium(2);
								}
							}}
						>
							<div class="flex flex-col">
								<p class="text-base font-bold">
									{`${suggestion.title} (${new Date(suggestion.release || 404).getFullYear()})`}
								</p>
								{#if suggestion.author != undefined}
									<p class="text-sm">Von: {suggestion.author || ''}</p>
								{/if}
								<p class="text-sm">{suggestion.genres || ''}</p>
							</div>
						</button>
					{/each}
					{#if loading && is_online}
						<div class="flex">
							<span class="loading m-auto mt-3 loading-md loading-dots"></span>
						</div>
					{/if}
				</div>
				{#if last_search_page != 1}
					<p class="mt-2 text-center text-base font-semibold">Nicht gefunden was du suchst?</p>
					<p class="mb-2 text-center text-base font-semibold">Hier manuell hinzufügen</p>
					<button
						class="btn mb-3 h-fit w-full py-2"
						onclick={async () => {
							last_selection = { title: search_val, release: new Date().toISOString() };
							if (current_mode == 0) {
								date_modal.checked = true;
							} else {
								addMedium(2);
							}
						}}
					>
						<div class="flex flex-col">
							<p class="text-base font-bold">
								{`${search_val} (${new Date().getFullYear()})`}
							</p>
						</div>
					</button>
				{/if}
			</div>
			<label class="modal-backdrop" for="search_modal">Close</label>
		</div>
		<!-- DateModal -->
		<input type="checkbox" id="date_modal" class="modal-toggle" bind:this={date_modal} />
		<div class="modal" role="dialog">
			<div class="modal-box flex flex-col">
				<p class="mb-1 text-center text-lg font-bold">{last_selection.title}</p>
				<WheelDatePicker
					bind:value={selected_date}
					max={new Date()}
					min={new Date(1888, 9, 14)}
					label={current_medium === 'games'
						? 'Gespielt am'
						: current_medium === 'books'
							? 'Gelesen am'
							: 'Geschaut am'}
					className="w-full"
				/>
				<button
					bind:this={add_button}
					class="btn mt-3 btn-success"
					onclick={() => {
						add_button.disabled = true;
						checkBacklog();
					}}>Hinzufügen</button
				>
			</div>
			<label class="modal-backdrop" for="date_modal">Close</label>
		</div>
		<!-- BacklogModal -->
		<input type="checkbox" id="backlog_modal" class="modal-toggle" bind:this={backlog_modal} />
		<div class="modal" role="dialog">
			<div class="modal-box flex flex-col">
				<p class="mb-1 text-center text-lg font-bold">
					{last_selection.title} wurde im Backlog gefunden
				</p>
				<p class="mb-3 text-center text-base font-semibold">
					Soll der Titel aus dem Backlog entfernt werden?
				</p>
				<button
					bind:this={backlog_button_1}
					class="btn mt-3 btn-success"
					onclick={() => {
						backlog_button_1.disabled = true;
						addMedium(0);
					}}>Entfernen und Reviews übernehmen</button
				>
				<button
					bind:this={backlog_button_2}
					class="btn mt-3 btn-warning"
					onclick={() => {
						backlog_button_2.disabled = true;
						addMedium(1);
					}}>Entfernen und Reviews verwerfen</button
				>
				<button
					bind:this={backlog_button_3}
					class="btn mt-3 btn-error"
					onclick={() => {
						backlog_button_3.disabled = true;
						addMedium(2);
					}}>Nicht aus dem Backlog entfernen</button
				>
			</div>
			<label class="modal-backdrop" for="backlog_modal">Close</label>
		</div>
		<!-- SeasonSelectModal -->
		<input
			type="checkbox"
			id="season_select_modal"
			class="modal-toggle"
			bind:this={season_select_modal}
		/>
		<div class="modal" role="dialog">
			<div class="modal-box flex flex-col">
				<p class="mb-1 text-center text-lg font-bold">{last_selection.title}</p>
				<p class="mb-3 text-center text-base font-semibold">Welche Staffel hast du gesehen?</p>
				<!-- TODO - Handle Scroll here -->
				<div class="scrollbar-hide max-h-[50vh] overflow-y-auto" onscroll={handleSuggestionScroll}>
					{#each current_season_suggestions as season}
						<button
							class="btn mb-3 h-fit w-full py-2"
							onclick={() => {
								last_selection.seasons = `${season.season_number}`;
								last_selection.image = season.poster_path;
								if (season.vote_average) {
									last_selection.averagerating = season.vote_average;
								}
								if (current_mode == 0) {
									season_select_modal.checked = false;
									date_modal.checked = true;
								} else {
									addMedium(2);
								}
							}}
						>
							<div class="flex flex-col">
								<p class="text-base font-bold">
									{`${season.name} (${new Date(season.air_date || 404).getFullYear()})`}
								</p>
								<p class="text-sm">Episoden: {season.episode_count || ''}</p>
							</div>
						</button>
					{/each}
					{#if loading && is_online}
						<div class="flex">
							<span class="loading m-auto mt-3 loading-md loading-dots"></span>
						</div>
					{/if}
				</div>
			</div>
			<label class="modal-backdrop" for="season_select_modal">Close</label>
		</div>
	</div>
	<!-- Add-Button -->
	{#if current_mode != 2 && own_profile}
		<button
			onclick={() => {
				last_search_page = 1;
				search_val = '';
				search_author = '';
				selected_date = new Date();
				search_modal.checked = true;
				current_suggestions = [];
			}}
			class="btn relative z-20 h-fit overflow-visible rounded-none rounded-t-lg border-none bg-base-100 pb-2 text-2xl shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.3),0_-4px_6px_-4px_rgba(0,0,0,0.3)] btn-neutral hover:bg-base-200"
		>
			+
		</button>
	{/if}
	<!-- Year-Slider -->
	<YearBar onSwitch={handleYearSwitch} years={years_in_db}></YearBar>
</div>
