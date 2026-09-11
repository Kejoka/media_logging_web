<script lang="ts">
	import CardList from '$lib/UI/Cards/cardList.svelte';
	import YearBar from '$lib/UI/yearBar.svelte';
	import { getYears, type mediaObject, type tvSeason } from '$lib/dbUtils.js';
	import WheelDatePicker from '$lib/UI/WheelDatePicker.svelte';
	import { onDestroy, onMount, tick } from 'svelte';
	import { get } from 'svelte/store';
	import { online_status } from '../../stores/onlineStatus';
	import {
		current_medium as current_medium_store,
		current_year as current_year_store,
		enabled_media_types,
		is_profile_transition_loading,
		sorting_method as sorting_method_store
	} from '../../stores/uiState';
	import {
		MEDIA_TYPE_ORDER,
		type MediaType,
		delay,
		getMediaCodeIndex,
		PAGE_SIZE,
		STATS_PAGE_SIZE,
		get_media_type_display_label,
		get_ui_mode_label_from_code
	} from '$lib/utils';
	import { pushToast } from '$lib/stores/toast';
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
		music,
		challenges = [],
		mediaId,
		mediaType,
		mediaYear,
		initialYear
	} = data;
	let availableYears: Partial<Record<MediaType, string[]>> = (data.availableYears ?? {}) as Partial<
		Record<MediaType, string[]>
	>;
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
		music,
		challenges = [],
		mediaId,
		mediaType,
		mediaYear,
		initialYear
	} = data);
	$: availableYears = (data.availableYears ?? {}) as Partial<Record<MediaType, string[]>>;
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
	let media_data: mediaObject[][] = [[], [], [], [], []];
	let media_data_unfiltered: mediaObject[][] = [];
	let media_loading_more: boolean[] = [false, false, false, false, false];
	let media_has_more: boolean[] = [true, true, true, true, true];
	let media_reloading = false;
	let stats_hydrating = false;
	let backlog_matches: mediaObject[] = [];
	let active_filter = '';
	let media_request_id = 0;
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
	function getDateTimestamp(dateValue?: string): number {
		if (!dateValue) {
			return Number.NEGATIVE_INFINITY;
		}
		const timestamp = new Date(dateValue).getTime();
		return Number.isNaN(timestamp) ? Number.NEGATIVE_INFINITY : timestamp;
	}

	function usePlaceholderImage(event: Event) {
		const image = event.currentTarget;
		if (image instanceof HTMLImageElement && !image.src.endsWith('/placeholder.png')) {
			image.src = '/placeholder.png';
		}
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

		while (!card && data_index >= 0 && media_has_more[data_index]) {
			await fetchMoreData({
				detail: { current_medium: (mediaType || 'movies') as MediaType }
			} as CustomEvent<{ current_medium: MediaType }>);
			await tick();
			card = media_data[data_index]?.find((m) => String(m.id) === String(mediaId));
		}

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
			books: '_b',
			music: '_u'
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

	function showSupabaseError(error: unknown, fallbackMessage: string) {
		pushToast(error instanceof Error && error.message ? error.message : fallbackMessage, 'error');
	}

	function getMediaArrayForType(medium: MediaType): mediaObject[] {
		return total_media_data[getMediaCodeIndex(medium)] ?? [];
	}

	function uniqueMediaById(list: mediaObject[]) {
		const seen = new Set<number | string>();
		return list.filter((medium) => {
			const key = medium.id ?? `${medium.title || ''}-${medium.added || ''}`;
			if (seen.has(key)) {
				return false;
			}
			seen.add(key);
			return true;
		});
	}

	function getYearsForCurrentMedium(activeYear: string) {
		return getYears(
			getMediaArrayForType(current_medium),
			activeYear,
			availableYears[current_medium]
		);
	}

	function normalizeYearForMode(year: string) {
		return current_mode === 1 ? 'Gesamt' : year;
	}

	function getActivePageSize() {
		return current_mode === 2 ? STATS_PAGE_SIZE : PAGE_SIZE;
	}

	async function fetchMediaPage(
		medium: MediaType,
		offset = 0,
		year = normalizeYearForMode(current_year),
		search = active_filter
	) {
		const res = await fetch('/api/v1/getMediaPage', {
			method: 'POST',
			body: JSON.stringify({
				current_medium: medium,
				user_id,
				offset,
				backlogged: current_mode === 1 ? 1 : 0,
				year,
				search,
				sorting_method,
				pageSize: getActivePageSize()
			}),
			headers: {
				'Content-Type': 'application/json'
			}
		});

		if (!res.ok) {
			throw new Error('Medien konnten nicht geladen werden.');
		}

		return (await res.json()) as { data?: mediaObject[]; hasMore?: boolean };
	}

	async function reloadVisibleMedia(year = normalizeYearForMode(current_year)) {
		const requestId = ++media_request_id;
		const filterForRequest = active_filter;
		media_reloading = true;
		try {
			const pages = await Promise.all(
				MEDIA_TYPE_ORDER.map((medium) => fetchMediaPage(medium, 0, year, filterForRequest))
			);
			if (requestId !== media_request_id) return;
			total_media_data = pages.map((page) => uniqueMediaById(page.data || []));
			media_has_more = pages.map(
				(page) => page.hasMore ?? (page.data?.length || 0) >= getActivePageSize()
			);
			await refreshCardList(year);
		} catch (error) {
			showSupabaseError(error, 'Medien konnten nicht geladen werden.');
		} finally {
			if (requestId === media_request_id) media_reloading = false;
		}
	}

	async function hydrateStatsData() {
		if (stats_hydrating) {
			return;
		}
		stats_hydrating = true;
		const hydration_year = current_year;
		try {
			for (const medium of MEDIA_TYPE_ORDER) {
				const medium_index = getMediaCodeIndex(medium);
				let medium_changed = false;
				while (
					current_mode === 2 &&
					current_year === hydration_year &&
					media_has_more[medium_index]
				) {
					const page = await fetchMediaPage(
						medium,
						total_media_data[medium_index]?.length || 0,
						hydration_year
					);
					const next_rows = page.data || [];
					if (next_rows.length === 0) {
						media_has_more[medium_index] = false;
						break;
					}
					total_media_data[medium_index] = uniqueMediaById([
						...total_media_data[medium_index],
						...next_rows
					]);
					media_has_more[medium_index] = page.hasMore ?? next_rows.length >= STATS_PAGE_SIZE;
					medium_changed = true;
					await delay(120);
				}
				if (medium_changed && current_mode === 2 && current_year === hydration_year) {
					await refreshCardList(hydration_year);
				}
			}
			media_has_more = [...media_has_more];
		} catch (error) {
			showSupabaseError(error, 'Statistiken konnten nicht vollständig geladen werden.');
		} finally {
			stats_hydrating = false;
		}
	}

	// Load data and set up inital states depending on online status and sync status
	onMount(async () => {
		is_profile_transition_loading.set(true);
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
		} else if (current_mode !== 1) {
			current_year = String(initialYear || new Date().getFullYear());
		}
		form_text = get_media_type_display_label(current_medium);
		total_media_data = [
			uniqueMediaById(games.data || []),
			uniqueMediaById(movies.data || []),
			uniqueMediaById(shows.data || []),
			uniqueMediaById(books.data || []),
			uniqueMediaById(music.data || [])
		];
		media_data = total_media_data.map((list) => [...list]);
		media_data_unfiltered = total_media_data.map((list) => [...list]);
		media_has_more = total_media_data.map((list) => list.length >= getActivePageSize());

		if (sorting_method !== 'date_added_desc') {
			await reloadVisibleMedia(normalizeYearForMode(current_year));
		} else {
			await refreshCardList(current_year);
		}
		applySortingToVisibleData();
		challenge_data = challenges;
		years_in_db = getYearsForCurrentMedium(current_year);
		if (current_mode === 1) {
			years_in_db = years_in_db.slice(-1);
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
			if (current_mode === 2) {
				void hydrateStatsData();
			}

			setTimeout(() => {
				is_initializing = false;
				is_profile_transition_loading.set(false);
			}, 100);
		});
	});

	onDestroy(() => {
		is_profile_transition_loading.set(true);
	});

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
				years_in_db = getYearsForCurrentMedium(current_year);
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
		// Search is not available in Stats mode. Clear it there so returning to a
		// list view cannot apply a query that is no longer shown in the input.
		if (current_mode === 2) {
			active_filter = '';
		}
		header_text = get_ui_mode_label_from_code(current_mode);
		if (current_mode != 1) {
			current_year = new Date().getFullYear().toString();
			await reloadVisibleMedia(current_year);
		} else {
			current_year = 'Gesamt';
			await reloadVisibleMedia('Gesamt');
			years_in_db = years_in_db.slice(-1);
		}
		if (current_mode === 2) {
			void hydrateStatsData();
		}
	}
	// HAndle the switch between individual years
	async function handleYearSwitch(event: any) {
		const year = event.year.year;
		current_year = year;
		await reloadVisibleMedia(year);
		if (current_mode === 2) {
			void hydrateStatsData();
		}
	}
	// Refreshes the current card list to visualize recent changes
	async function refreshCardList(set_year: string) {
		const normalized_year = current_mode === 1 ? 'Gesamt' : set_year;
		current_year = normalized_year;
		media_data = total_media_data.map((list) => [...list]);
		media_data_unfiltered = media_data.map((list) => [...list]);
		applySortingToVisibleData();
		years_in_db = getYearsForCurrentMedium(normalized_year);
		if (current_mode === 1) {
			years_in_db = years_in_db.slice(-1);
		}
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
			try {
				const res = await fetch('/api/v1/getSearchSuggestions', {
					method: 'POST',
					body: JSON.stringify({ search_val, search_author, last_search_page, current_medium }),
					headers: {
						'Content-Type': 'application/json'
					}
				});
				if (!res.ok) {
					throw new Error('Suchvorschläge konnten nicht geladen werden.');
				}
				current_suggestions = await res.json();
			} catch (error) {
				showSupabaseError(error, 'Suchvorschläge konnten nicht geladen werden.');
			} finally {
				loading = false;
			}
		}, 1000);
	}
	// The filter is applied on the server before pagination, so it also finds entries
	// that are not part of the currently loaded page.
	async function handleFilter(detail: { value: string }) {
		const nextFilter = detail.value.trim();
		if (nextFilter === active_filter) return;
		active_filter = nextFilter;
		await reloadVisibleMedia(normalizeYearForMode(current_year));
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

	async function handleSortingMethodChange(detail: { method: SortingMethod }) {
		if (sorting_method === detail.method) {
			return;
		}
		sorting_method = detail.method;
		if (is_initializing) {
			applySortingToVisibleData();
			return;
		}
		await reloadVisibleMedia(normalizeYearForMode(current_year));
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
			try {
				const res = await fetch('/api/v1/getSearchSuggestions', {
					method: 'POST',
					body: JSON.stringify({ search_val, search_author, last_search_page, current_medium }),
					headers: {
						'Content-Type': 'application/json'
					}
				});
				if (!res.ok) {
					throw new Error('Suchvorschläge konnten nicht geladen werden.');
				}
				const json_res = (await res.json()) as mediaObject[];
				if (json_res.length != 0) {
					current_suggestions = [...current_suggestions, ...json_res];
				} else {
					last_search_page = -1;
				}
			} catch (error) {
				showSupabaseError(error, 'Suchvorschläge konnten nicht geladen werden.');
			} finally {
				loading = false;
			}
		}
	}

	// Checks if an item that is about to be added already exists in the backlog
	async function checkBacklog() {
		const title = last_selection.title?.trim();
		if (!title) {
			await addMedium(2);
			return;
		}

		try {
			// Backlog entries are loaded independently from the active log view, so this
			// also works when pagination has not yet reached the matching entry.
			const response = await fetch('/api/v1/getMediaPage', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					current_medium,
					user_id,
					offset: 0,
					backlogged: 1,
					year: 'Gesamt',
					exactTitle: title,
					pageSize: 100
				})
			});
			if (!response.ok) throw new Error('Backlog konnte nicht geprüft werden.');
			const payload = (await response.json()) as { data?: mediaObject[] };
			backlog_matches = payload.data || [];
		} catch (error) {
			showSupabaseError(error, 'Backlog konnte nicht geprüft werden.');
			add_button.disabled = false;
			return;
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
					if (!res.ok) {
						throw new Error('Backlog-Eintrag konnte nicht entfernt werden.');
					}
				} catch (error) {
					showSupabaseError(error, 'Backlog-Eintrag konnte nicht entfernt werden.');
				}
			}
		}
		if (backlog_event == 0 && backlog_reviews.length != 0) {
			last_selection.notes = backlog_reviews.substring(0, backlog_reviews.length - 1);
		}
		// Supabase
		try {
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
			if (!res.ok) {
				const payload = (await res.json().catch(() => null)) as { error?: string } | null;
				throw new Error(payload?.error || 'Titel konnte nicht hinzugefügt werden.');
			}
			const json = (await res.json()) as { data?: { id?: number } };
			last_selection.id = json.data?.id;
		} catch (error) {
			showSupabaseError(error, 'Titel konnte nicht hinzugefügt werden.');
			add_button.disabled = false;
			return;
		}

		if (current_mode == 0) {
			current_year = selected_date.getFullYear().toString();
			await reloadVisibleMedia(current_year);
		} else {
			await reloadVisibleMedia('Gesamt');
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
		let unique_id: number | undefined;
		try {
			const res = await fetch('/api/v1/deleteMedium', {
				method: 'POST',
				body: JSON.stringify({ medium_id, current_medium, sync_timestamp }),
				headers: {
					'Content-Type': 'application/json'
				}
			});
			if (!res.ok) {
				throw new Error('Titel konnte nicht gelöscht werden.');
			}
		} catch (error) {
			showSupabaseError(error, 'Titel konnte nicht gelöscht werden.');
			return;
		}
		if (current_mode == 0) {
			await reloadVisibleMedia(current_year);
		} else {
			await reloadVisibleMedia('Gesamt');
			years_in_db = years_in_db.slice(-1);
		}
	}

	async function fetchMoreData(event: CustomEvent<{ current_medium: MediaType }>) {
		const medium_to_load = event.detail.current_medium;
		const medium_index = getMediaCodeIndex(medium_to_load);
		if (medium_index < 0 || media_loading_more[medium_index] || !media_has_more[medium_index]) {
			return;
		}

		media_loading_more[medium_index] = true;
		media_loading_more = [...media_loading_more];
		const requestId = media_request_id;
		const filterForRequest = active_filter;
		const yearForRequest = normalizeYearForMode(current_year);
		try {
			const offset = total_media_data[medium_index]?.length || 0;
			const res = await fetch('/api/v1/getMediaPage', {
				method: 'POST',
				body: JSON.stringify({
					current_medium: medium_to_load,
					user_id,
					offset,
					backlogged: current_mode === 1 ? 1 : 0,
					year: yearForRequest,
					search: filterForRequest,
					sorting_method,
					pageSize: getActivePageSize()
				}),
				headers: {
					'Content-Type': 'application/json'
				}
			});

			if (!res.ok) {
				throw new Error('Weitere Medien konnten nicht geladen werden.');
			}

			const json = (await res.json()) as { data?: mediaObject[]; hasMore?: boolean };
			if (requestId !== media_request_id || filterForRequest !== active_filter) return;
			const new_media = json.data || [];
			if (new_media.length === 0) {
				media_has_more[medium_index] = false;
				media_has_more = [...media_has_more];
				return;
			}

			total_media_data[medium_index] = uniqueMediaById([
				...total_media_data[medium_index],
				...new_media
			]);
			await refreshCardList(current_mode === 1 ? 'Gesamt' : current_year);
			media_has_more[medium_index] = json.hasMore ?? new_media.length >= getActivePageSize();
			media_has_more = [...media_has_more];
		} catch (error) {
			showSupabaseError(error, 'Weitere Medien konnten nicht geladen werden.');
		} finally {
			media_loading_more[medium_index] = false;
			media_loading_more = [...media_loading_more];
		}
	}
</script>

<svelte:head>
	<title>Media-Logging</title>
</svelte:head>
<div class="flex h-full flex-col">
	<nav class="sticky top-0 right-0 left-0 z-30 shrink-0">
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
	<div class="relative z-0 min-h-0 flex-1 overflow-y-hidden">
		<!-- Mode and Media Mode Tabs -->
		<!-- Entries -->
		<div
			bind:this={carousel}
			onscroll={handleMediaSwitch}
			class="scrollbar-hide carousel h-full w-full overflow-y-auto"
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
						isLoadingMore={media_loading_more[getMediaCodeIndex(media_type)]}
						isReloading={media_reloading}
						isStatsHydrating={stats_hydrating}
						hasMoreStatsData={media_has_more[getMediaCodeIndex(media_type)]}
						on:delete={deleteMedium}
						on:refresh={() => reloadVisibleMedia(current_mode === 1 ? 'Gesamt' : current_year)}
						on:challenge_updated={handleChallengeUpdated}
						on:challenge_deleted={handleChallengeDeleted}
						on:swipe={handleMediaSwitch}
						on:fetchmore={fetchMoreData}
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
						placeholder={current_medium === 'music' ? 'Titel oder Künstler suchen' : 'Suche'}
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
							<div class="flex w-full items-center gap-3 text-left">
								<img
									src={suggestion.image || '/placeholder.png'}
									alt=""
									class="h-16 w-11 shrink-0 rounded bg-base-200 object-cover"
									onerror={usePlaceholderImage}
								/>
								<div class="min-w-0 flex-1">
									<p class="line-clamp-2 text-base font-bold">
										{`${suggestion.title} (${new Date(suggestion.release || 404).getFullYear()})`}
									</p>
									{#if suggestion.author != undefined}
										<p class="line-clamp-1 text-sm">Von: {suggestion.author || ''}</p>
									{/if}
									{#if current_medium === 'music'}
										<p class="line-clamp-1 text-sm">
											{suggestion.artist || 'Unbekannter Künstler'} · {suggestion.music_type ===
											'ep'
												? 'EP'
												: suggestion.music_type === 'single'
													? 'Single'
													: 'Album'}
										</p>
									{/if}
									<p class="line-clamp-1 text-sm">{suggestion.genres || ''}</p>
								</div>
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
							: current_medium === 'music'
								? 'Gehört am'
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
