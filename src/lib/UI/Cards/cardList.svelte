<script lang="ts">
	import { goto } from '$app/navigation';
	import JustWatch_Logo from '../../Icons/justwatch.svelte';
	import TvCard from './tvCard.svelte';
	import { type mediaObject, type OfflineChangeObject } from '$lib/dbUtils';
	import { createEventDispatcher } from 'svelte';
	import GameCard from './gameCard.svelte';
	import MovieCard from './movieCard.svelte';
	import BookCard from './bookCard.svelte';
	import WheelDatePicker from '$lib/UI/WheelDatePicker.svelte';
	import StatCard from './statCard.svelte';
	import ChartCard from './chartCard.svelte';
	import ChallengeCard from './challengeCard.svelte';
	import Star from '../Stars_modified/Star.svelte';
	import TagInput from '$lib/UI/TagInput.svelte';
	import movieGenres from '$lib/movieGenres';
	import tvGenres from '$lib/tvGenres';
	import gameGenres from '$lib/gameGenres';
	import bookGenres from '$lib/bookGenres';
	import gamePlatforms from '$lib/gamePlatforms';
	import { decodeReviewNotes, encodeReviewNotes, isLegacyReviewNotes } from '$lib/reviewNotes';
	import { pushToast } from '$lib/stores/toast';
	import type { SortingMethod, UserChallenge } from '$lib/types';
	export let media_data: mediaObject[];
	export let current_medium: string;
	export let current_mode: number;
	export let own_profile: boolean;
	export let current_year: string;
	export let sorting_method: SortingMethod = 'date_added_desc';
	export let challenges: UserChallenge[] = [];
	export let isLoadingMore = false;
	export let isReloading = false;
	export let isStatsHydrating = false;
	export let hasMoreStatsData = false;
	let media_scroll_container: HTMLDivElement;
	let delete_modal: HTMLInputElement;
	let streaming_modal: HTMLInputElement;
	let edit_modal: HTMLInputElement;
	let social_modal: HTMLInputElement;
	let to_delete: mediaObject = { title: '' };
	let to_edit: mediaObject = { title: '' };
	let original_to_edit_release: string | null = null;
	let original_to_edit_added: string | null = null;
	let to_editRelease: Date = new Date();
	let to_editAdded: Date = new Date();
	let to_editGenreTags: string[] = [];
	let to_editPlatformTags: string[] = [];
	let to_editSeasonStart: number | null = null;
	let to_editSeasonEnd: number | null = null;
	let to_editEpisode = 0;
	let to_editTrophy = false;
	let show_advanced_fields = false;
	let replacementSearchValue = '';
	let replacementSearchAuthor = '';
	let replacementSuggestions: mediaObject[] = [];
	let replacementSearchLoading = false;
	let replacementSearchError: string | null = null;
	let replacementSearchTimer: ReturnType<typeof setTimeout> | null = null;
	let replacementSearchRequestId = 0;
	let legacyMigrationRunning = false;
	let migratedLegacyNoteIds: number[] = [];
	type StreamingProvider = {
		logo_path: string;
		provider_name: string;
		// add other properties if needed
	};
	let streaming_data: {
		ads?: StreamingProvider[];
		buy?: StreamingProvider[];
		flatrate?: StreamingProvider[];
		rent?: StreamingProvider[];
	} = {};
	type SocialUserState = {
		user_id: string;
		username: string;
		media_id?: number;
		media_year?: number;
		mode?: number;
		hasPendingRecommendation?: boolean;
	};
	let social_medium: mediaObject | null = null;
	let social_loading = false;
	let social_sending = false;
	let social_sending_username: string | null = null;
	let social_error: string | null = null;
	let social_message = '';
	let social_consumed: SocialUserState[] = [];
	let social_backlog: SocialUserState[] = [];
	let social_eligible: SocialUserState[] = [];
	const dispatch = createEventDispatcher();
	const monthFormatter = new Intl.DateTimeFormat('de-DE', { month: 'long' });

	function showSupabaseError(error: unknown, fallbackMessage: string) {
		pushToast(error instanceof Error && error.message ? error.message : fallbackMessage, 'error');
	}

	function usePlaceholderImage(event: Event) {
		const image = event.currentTarget;
		if (image instanceof HTMLImageElement && !image.src.endsWith('/placeholder.png')) {
			image.src = '/placeholder.png';
		}
	}

	function handleScroll() {
		if (current_mode === 2 || isReloading || !media_scroll_container) {
			return;
		}
		const remaining_scroll =
			media_scroll_container.scrollHeight -
			media_scroll_container.scrollTop -
			media_scroll_container.clientHeight;
		if (remaining_scroll <= 48) {
			dispatch('fetchmore', { current_medium });
		}
	}

	const skeletonRows = Array.from({ length: 8 });
	const skeletonStatCards = Array.from({ length: 6 });

	function splitCommaSeparatedValues(value?: string): string[] {
		if (!value) {
			return [];
		}
		return value
			.split(',')
			.map((entry) => entry.trim())
			.filter((entry) => entry.length > 0);
	}

	function joinCommaSeparatedValues(values: string[]): string | null {
		const normalized = values
			.map((entry) => entry.trim())
			.filter((entry) => entry.length > 0)
			.filter((entry, index, self) => self.indexOf(entry) === index);
		if (normalized.length === 0) {
			return null;
		}
		return normalized.join(', ');
	}

	function parseSeasonRange(rawSeasons?: string): { start: number | null; end: number | null } {
		if (!rawSeasons || rawSeasons.trim().length === 0) {
			return { start: null, end: null };
		}
		const normalized = rawSeasons.trim();
		if (normalized.includes('-')) {
			const [startRaw, endRaw] = normalized.split('-').map((entry) => entry.trim());
			const start = Number.parseInt(startRaw, 10);
			const end = Number.parseInt(endRaw, 10);
			if (!Number.isNaN(start) && start > 0 && !Number.isNaN(end) && end > 0) {
				return { start: Math.min(start, end), end: Math.max(start, end) };
			}
			return { start: null, end: null };
		}
		const single = Number.parseInt(normalized, 10);
		if (!Number.isNaN(single) && single > 0) {
			return { start: single, end: single };
		}
		return { start: null, end: null };
	}

	function serializeSeasonRange(start: number | null, end: number | null): string | null {
		if (start === null || Number.isNaN(start) || start <= 0) {
			return null;
		}
		if (end === null || Number.isNaN(end) || end <= 0 || end === start) {
			return String(start);
		}
		const minSeason = Math.min(start, end);
		const maxSeason = Math.max(start, end);
		return `${minSeason}-${maxSeason}`;
	}

	function clampNonNegativeInt(value: unknown): number {
		const parsed = Number(value);
		if (!Number.isFinite(parsed)) {
			return 0;
		}
		return Math.max(Math.round(parsed), 0);
	}

	function getCurrentGenreSuggestions(): string[] {
		switch (current_medium) {
			case 'movies':
				return movieGenres.genres.map((entry) => entry.name);
			case 'shows':
				return tvGenres.genres.map((entry) => entry.name);
			case 'games':
				return gameGenres.genres.map((entry) => entry.name);
			case 'books':
				return bookGenres.genres.map((entry) => entry.name);
			default:
				return [];
		}
	}

	$: genreSuggestions = getCurrentGenreSuggestions();
	$: platformSuggestions = gamePlatforms.platforms.map((entry) => entry.name);

	// Determine if we're in a year-specific view or "Gesamt" (all years)
	$: isYearSpecific = current_year !== 'Gesamt' && Number.isFinite(Number(current_year));
	$: showStatsLoadingIndicator = current_mode === 2 && (isStatsHydrating || hasMoreStatsData);

	// Get separator key and label based on sorting method
	function getSeparatorKey(medium: mediaObject): string {
		switch (true) {
			case sorting_method.startsWith('date_added'):
				return getDateAddedSeparatorKey(medium.added);
			case sorting_method.startsWith('release_date'):
				return getReleaseDateSeparatorKey(medium.release);
			case sorting_method.startsWith('review_score'):
				return getRatingSeparatorKey(medium.rating || 0);
			case sorting_method.startsWith('title'):
				return getTitleSeparatorKey(medium.title || '');
			default:
				return 'unbekannt';
		}
	}

	function getDateAddedSeparatorKey(dateValue?: string): string {
		if (!dateValue) {
			return 'unbekannt';
		}
		const date = new Date(dateValue);
		if (Number.isNaN(date.getTime())) {
			return 'unbekannt';
		}
		// For date_added: separate by month-year if in year view, full year-month if in backlog/Gesamt
		if (current_mode === 1 || !isYearSpecific) {
			return `${date.getFullYear()}-${date.getMonth()}`;
		}
		return `${date.getFullYear()}-${date.getMonth()}`;
	}

	function getReleaseDateSeparatorKey(dateValue?: string): string {
		if (!dateValue) {
			return 'unbekannt';
		}
		const date = new Date(dateValue);
		if (Number.isNaN(date.getTime())) {
			return 'unbekannt';
		}
		// For release_date: separate by year only
		return `year-${date.getFullYear()}`;
	}

	function getRatingSeparatorKey(rating: number): string {
		// Round to nearest 0.5
		const rounded = Math.round(rating * 2) / 2;
		if (rating === 0) {
			return 'rating-no-rating';
		}
		return `rating-${rounded}`;
	}

	function getTitleSeparatorKey(title: string): string {
		if (!title || title.length === 0) {
			return 'unbekannt';
		}
		return title.charAt(0).toUpperCase();
	}

	function formatMonthLabel(dateValue?: string): string {
		if (!dateValue) {
			return 'Unbekannt';
		}
		const date = new Date(dateValue);
		if (Number.isNaN(date.getTime())) {
			return 'Unbekannt';
		}
		const month = monthFormatter.format(date).replace(/^[a-z]/, (char) => char.toUpperCase());
		// Add year if in backlog mode or Gesamt view
		if (current_mode === 1 || !isYearSpecific) {
			return `${month} ${date.getFullYear()}`;
		}
		return month;
	}

	function formatSeparatorLabel(medium: mediaObject): string {
		switch (true) {
			case sorting_method.startsWith('date_added'):
				return formatMonthLabel(medium.added);
			case sorting_method.startsWith('release_date'):
				return formatYearLabel(medium.release);
			case sorting_method.startsWith('review_score'): {
				const rating = medium.rating || 0;
				if (rating === 0) {
					return 'Keine Bewertung';
				}
				const rounded = Math.round(rating * 2) / 2;
				return `${rounded} Sterne`;
			}
			case sorting_method.startsWith('title'):
				return medium.title?.charAt(0).toUpperCase() || 'Unbekannt';
			default:
				return 'Unbekannt';
		}
	}

	function formatYearLabel(dateValue?: string): string {
		if (!dateValue) {
			return 'Unbekannt';
		}
		const date = new Date(dateValue);
		if (Number.isNaN(date.getTime())) {
			return 'Unbekannt';
		}
		return date.getFullYear().toString();
	}

	function shouldRenderSeparator(index: number): boolean {
		if (index === 0) {
			return true;
		}
		const currentKey = getSeparatorKey(media_data[index]);
		const previousKey = getSeparatorKey(media_data[index - 1]);
		const shouldRender = currentKey !== previousKey;
		return shouldRender;
	}

	// Reaktive Variable für Separator-Keys - wird neu berechnet, wenn sich Sortierung ändert
	$: separatorKeys = media_data.map((medium, index) => ({
		index,
		key: getSeparatorKey(medium),
		shouldRender: index === 0 || getSeparatorKey(medium) !== getSeparatorKey(media_data[index - 1])
	}));

	function getRatingConfig(score: number) {
		return {
			readOnly: own_profile ? false : true,
			countStars: 5,
			range: {
				min: 0,
				max: 5,
				step: 0.5
			},
			score: score,
			showScore: false,
			scoreFormat: function () {
				return `(${this.score.toFixed(0)}/${this.countStars})`;
			},
			name: 'stars',
			starConfig: {
				size: 14,
				fillColor: 'var(--color-accent)',
				strokeColor: 'var(--color-accent)',
				unfilledColor: 'var(--color-base-300)',
				strokeUnfilledColor: 'var(--color-base-300)'
			}
		};
	}

	function patchVisibleMedium(mediumId: number | undefined, patch: Partial<mediaObject>) {
		if (mediumId == null) {
			return;
		}
		media_data = media_data.map((medium) =>
			medium.id === mediumId ? ({ ...medium, ...patch } as mediaObject) : medium
		);
		if (social_medium?.id === mediumId) {
			social_medium = { ...social_medium, ...patch };
		}
	}

	async function updateScore(event: CustomEvent) {
		try {
			const sync_timestamp = new Date();
			const mediumId = event.detail.medium.id;
			const previousScore =
				media_data.find((obj) => obj.id == mediumId)?.rating ?? event.detail.medium.rating;
			patchVisibleMedium(mediumId, { rating: event.detail.new_score });
			try {
				const res = await fetch('/api/v1/updateScore', {
					method: 'POST',
					body: JSON.stringify({
						score: event.detail.new_score,
						medium: event.detail.medium,
						current_medium,
						sync_timestamp
					}),
					headers: {
						'Content-Type': 'application/json'
					}
				});
				if (!res.ok) {
					throw new Error('Bewertung konnte nicht gespeichert werden.');
				}
			} catch (error) {
				patchVisibleMedium(mediumId, { rating: previousScore });
				showSupabaseError(error, 'Bewertung konnte nicht gespeichert werden.');
			}
		} catch (error) {
			showSupabaseError(error, 'Bewertung konnte nicht gespeichert werden.');
		}
	}

	async function updateNotes(event: CustomEvent<{ medium: mediaObject; notes: string }>) {
		try {
			const normalizedNotes =
				event.detail.notes.trim().length > 0 ? event.detail.notes.trim() : undefined;
			const mediumIndex = media_data.findIndex((obj) => obj.id == event.detail.medium.id);
			if (mediumIndex === -1) {
				return;
			}

			const currentNotes = media_data[mediumIndex].notes || '';
			const nextNotes = normalizedNotes || '';
			if (currentNotes === nextNotes) {
				return;
			}

			const updatedMedium = { ...media_data[mediumIndex], notes: normalizedNotes } as mediaObject;
			patchVisibleMedium(updatedMedium.id, { notes: normalizedNotes });
			const sync_timestamp = new Date();

			try {
				const res = await fetch('/api/v1/updateMedium', {
					method: 'POST',
					body: JSON.stringify({
						medium_fields_to_update: updatedMedium,
						current_medium,
						sync_timestamp
					}),
					headers: {
						'Content-Type': 'application/json'
					}
				});
				if (!res.ok) {
					throw new Error('Änderungen konnten nicht gespeichert werden.');
				}
			} catch (error) {
				patchVisibleMedium(updatedMedium.id, { notes: currentNotes });
				showSupabaseError(error, 'Änderungen konnten nicht gespeichert werden.');
			}
		} catch (error) {
			showSupabaseError(error, 'Änderungen konnten nicht gespeichert werden.');
		}
	}

	function askDelete(event: CustomEvent) {
		to_delete = event.detail;
		delete_modal.checked = true;
	}

	function showEditForm(event: CustomEvent) {
		to_edit = event.detail;
		original_to_edit_release = to_edit.release || null;
		original_to_edit_added = to_edit.added || null;
		to_editRelease = new Date(to_edit.release || '');
		to_editAdded = new Date(to_edit.added || '');
		to_editGenreTags = splitCommaSeparatedValues(to_edit.genres);
		to_editPlatformTags = splitCommaSeparatedValues(to_edit.platforms);
		const seasonRange = parseSeasonRange(to_edit.seasons);
		to_editSeasonStart = seasonRange.start;
		to_editSeasonEnd = seasonRange.end;
		to_editEpisode = clampNonNegativeInt(to_edit.episode);
		to_editTrophy = Number(to_edit.trophy || 0) > 0;
		show_advanced_fields = false;
		resetReplacementSearch();
		edit_modal.checked = true;
	}

	function resetReplacementSearch() {
		if (replacementSearchTimer) {
			clearTimeout(replacementSearchTimer);
			replacementSearchTimer = null;
		}
		replacementSearchValue = '';
		replacementSearchAuthor = '';
		replacementSuggestions = [];
		replacementSearchLoading = false;
		replacementSearchError = null;
		++replacementSearchRequestId;
	}

	function scheduleReplacementSearch() {
		if (replacementSearchTimer) {
			clearTimeout(replacementSearchTimer);
		}
		const query = replacementSearchValue.trim();
		if (!query) {
			replacementSuggestions = [];
			replacementSearchLoading = false;
			replacementSearchError = null;
			return;
		}
		replacementSearchLoading = true;
		replacementSearchError = null;
		replacementSearchTimer = setTimeout(() => void searchReplacement(query), 400);
	}

	async function searchReplacement(query: string) {
		const requestId = ++replacementSearchRequestId;
		try {
			const res = await fetch('/api/v1/getSearchSuggestions', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					search_val: query,
					search_author: replacementSearchAuthor,
					last_search_page: 1,
					current_medium
				})
			});
			if (!res.ok) throw new Error('Suchvorschläge konnten nicht geladen werden.');
			if (requestId === replacementSearchRequestId) {
				replacementSuggestions = (await res.json()) as mediaObject[];
			}
		} catch (error) {
			if (requestId === replacementSearchRequestId) {
				replacementSuggestions = [];
				replacementSearchError =
				error instanceof Error ? error.message : 'Suchvorschläge konnten nicht geladen werden.';
			}
		} finally {
			if (requestId === replacementSearchRequestId) replacementSearchLoading = false;
		}
	}

	function replaceMetadata(selection: mediaObject) {
		// Keep all logging-specific fields on this card; only replace data supplied by the source.
		const replacementRelease = selection.release || to_edit.release;
		to_edit = {
			...to_edit,
			title: selection.title,
			image: selection.image,
			release: replacementRelease,
			genres: selection.genres,
			averagerating:
				current_medium === 'games' && selection.averagerating !== undefined
					? Number((selection.averagerating / 10).toFixed(1))
					: selection.averagerating,
			...(current_medium === 'games'
				? { igdbid: selection.igdbid, platforms: selection.platforms }
				: {}),
			...(current_medium === 'movies' || current_medium === 'shows'
				? { tmdbid: selection.tmdbid }
				: {}),
			...(current_medium === 'books'
				? {
						gbid: selection.gbid,
						subtitle: selection.subtitle,
						author: selection.author,
						pagecount: selection.pagecount
					}
				: {})
		};
		to_editRelease = new Date(replacementRelease || '');
		original_to_edit_release = replacementRelease || null;
		to_editGenreTags = splitCommaSeparatedValues(selection.genres);
		if (current_medium === 'games') to_editPlatformTags = splitCommaSeparatedValues(selection.platforms);
		resetReplacementSearch();
		pushToast('Metadaten wurden ersetzt. Speichere die Änderungen, um sie zu übernehmen.', 'success');
	}

	function getDayKey(dateValue: string | null): string | null {
		if (!dateValue) {
			return null;
		}
		const parsed = new Date(dateValue);
		if (Number.isNaN(parsed.getTime())) {
			return null;
		}
		return parsed.toISOString().substring(0, 10);
	}

	function toIsoOrFallback(date: Date, fallback: string | null): string {
		if (!Number.isNaN(date.getTime())) {
			return date.toISOString();
		}
		if (fallback) {
			return fallback;
		}
		return new Date().toISOString();
	}

	async function showProviderList(event: CustomEvent) {
		try {
			const res = await fetch('/api/v1/getStreamingProviders', {
				method: 'POST',
				body: JSON.stringify({
					tmdb_id: event.detail.tmdbid,
					medium: current_medium
				}),
				headers: {
					'Content-Type': 'application/json'
				}
			});
			if (!res.ok) {
				throw new Error('Streamingdienste konnten nicht geladen werden.');
			}
			const data = (await res.json()) as { results: { DE: typeof streaming_data } };
			streaming_data = data.results.DE;
			streaming_modal.checked = true;
		} catch (error) {
			showSupabaseError(error, 'Streamingdienste konnten nicht geladen werden.');
		}
	}

	async function openSocialModal(event: CustomEvent<mediaObject>) {
		social_medium = event.detail;
		social_message = '';
		social_error = null;
		social_consumed = [];
		social_backlog = [];
		social_eligible = [];
		social_modal.checked = true;
		await loadSocialState();
	}

	async function loadSocialState() {
		if (!social_medium) {
			return;
		}
		social_loading = true;
		social_error = null;
		try {
			const res = await fetch('/api/v1/getMediumFollowersState', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					mediaType: current_medium,
					medium: social_medium
				})
			});

			if (!res.ok) {
				throw new Error('Social-Daten konnten nicht geladen werden.');
			}

			const payload = (await res.json()) as {
				consumed?: SocialUserState[];
				backlog?: SocialUserState[];
				eligible?: SocialUserState[];
			};

			social_consumed = payload.consumed || [];
			social_backlog = payload.backlog || [];
			social_eligible = payload.eligible || [];
		} catch (error) {
			showSupabaseError(error, 'Social-Daten konnten nicht geladen werden.');
			social_error = 'Social-Daten konnten nicht geladen werden.';
		} finally {
			social_loading = false;
		}
	}

	async function navigateToUserEntry(user: SocialUserState) {
		if (!user.username) {
			return;
		}
		let url = `/${user.username}`;
		const params = new URLSearchParams();
		if (user.media_id != null) {
			params.append('mediaId', String(user.media_id));
		}
		params.append('mediaType', current_medium);
		if (user.media_year != null) {
			params.append('mediaYear', String(user.media_year));
		}
		if (user.mode != null) {
			params.append('mode', String(user.mode));
		}
		if (params.size > 0) {
			url += `?${params.toString()}`;
		}
		social_modal.checked = false;
		await goto(url);
	}

	async function sendRecommendation(recipient: SocialUserState) {
		if (!social_medium || !recipient.username) {
			return;
		}
		social_sending = true;
		social_sending_username = recipient.username;
		social_error = null;
		try {
			const res = await fetch('/api/v1/sendRecommendation', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					recipientUsername: recipient.username,
					mediaType: current_medium,
					medium: social_medium,
					message: social_message
				})
			});
			const json = (await res.json()) as { error?: string };
			if (!res.ok) {
				throw new Error(json.error || 'Empfehlung konnte nicht versendet werden.');
			}
			await loadSocialState();
		} catch (error) {
			showSupabaseError(error, 'Empfehlung konnte nicht versendet werden.');
			social_error =
				error instanceof Error ? error.message : 'Empfehlung konnte nicht versendet werden.';
		} finally {
			social_sending = false;
			social_sending_username = null;
		}
	}

	async function updateMedium() {
		const releaseFromPicker = toIsoOrFallback(to_editRelease, original_to_edit_release);
		const addedFromPicker = toIsoOrFallback(to_editAdded, original_to_edit_added);
		const normalizedNotes = encodeReviewNotes(decodeReviewNotes(to_edit.notes).bubbles);

		const keepOriginalRelease =
			getDayKey(original_to_edit_release) !== null &&
			getDayKey(original_to_edit_release) === getDayKey(releaseFromPicker);
		const keepOriginalAdded =
			getDayKey(original_to_edit_added) !== null &&
			getDayKey(original_to_edit_added) === getDayKey(addedFromPicker);

		to_edit.release = keepOriginalRelease
			? original_to_edit_release || releaseFromPicker
			: releaseFromPicker;
		to_edit.added = keepOriginalAdded ? original_to_edit_added || addedFromPicker : addedFromPicker;
		to_edit.notes = normalizedNotes;
		to_edit.genres = joinCommaSeparatedValues(to_editGenreTags) || undefined;
		if (current_medium === 'games') {
			to_edit.platforms = joinCommaSeparatedValues(to_editPlatformTags) || undefined;
		}
		if (current_medium === 'shows') {
			to_edit.seasons = serializeSeasonRange(to_editSeasonStart, to_editSeasonEnd) || undefined;
			to_edit.episode = clampNonNegativeInt(to_editEpisode);
		}
		if (current_medium === 'games') {
			to_edit.trophy = to_editTrophy ? 1 : 0;
		}
		const previousMedium = media_data.find((obj) => obj.id == to_edit.id);
		patchVisibleMedium(to_edit.id, to_edit);
		const sync_timestamp = new Date();

		try {
			const res = await fetch('/api/v1/updateMedium', {
				method: 'POST',
				body: JSON.stringify({ medium_fields_to_update: to_edit, current_medium, sync_timestamp }),
				headers: {
					'Content-Type': 'application/json'
				}
			});
			if (!res.ok) {
				throw new Error('Änderungen konnten nicht gespeichert werden.');
			}
		} catch (error) {
			if (previousMedium) {
				patchVisibleMedium(previousMedium.id, previousMedium);
			}
			showSupabaseError(error, 'Änderungen konnten nicht gespeichert werden.');
			return;
		}
		const collapse_input = document.getElementById(
			String(to_edit.id) + `_${current_medium.charAt(0)}`
		);
		if (collapse_input != null && collapse_input instanceof HTMLInputElement) {
			collapse_input.checked = !collapse_input.checked;
		}
		dispatch('refresh');
		edit_modal.checked = false;
	}

	async function updateTrophy(event: CustomEvent<{ medium: mediaObject; new_value: number }>) {
		const mediumId = event.detail.medium.id;
		const previousValue = event.detail.medium.trophy || 0;
		patchVisibleMedium(mediumId, { trophy: event.detail.new_value });
		const sync_timestamp = new Date();

		try {
			const res = await fetch('/api/v1/updateTrophy', {
				method: 'POST',
				body: JSON.stringify({
					new_value: event.detail.new_value,
					id: mediumId,
					sync_timestamp
				})
			});
			if (!res.ok) {
				throw new Error('Trophäe konnte nicht gespeichert werden.');
			}
		} catch (error) {
			patchVisibleMedium(mediumId, { trophy: previousValue });
			showSupabaseError(error, 'Trophäe konnte nicht gespeichert werden.');
		}
	}

	async function updateEpisode(event: CustomEvent<{ medium: mediaObject; new_value: number }>) {
		const mediumId = event.detail.medium.id;
		const previousValue = event.detail.medium.episode || 0;
		patchVisibleMedium(mediumId, { episode: event.detail.new_value });
		const sync_timestamp = new Date();

		try {
			const res = await fetch('/api/v1/updateEpisode', {
				method: 'POST',
				body: JSON.stringify({
					new_value: event.detail.new_value,
					id: mediumId,
					sync_timestamp
				})
			});
			if (!res.ok) {
				throw new Error('Episode konnte nicht gespeichert werden.');
			}
		} catch (error) {
			patchVisibleMedium(mediumId, { episode: previousValue });
			showSupabaseError(error, 'Episode konnte nicht gespeichert werden.');
		}
	}

	async function migrateLegacyNotes() {
		if (!own_profile || legacyMigrationRunning) {
			return;
		}

		legacyMigrationRunning = true;
		try {
			for (const medium of media_data) {
				if (typeof medium.id !== 'number') {
					continue;
				}
				if (migratedLegacyNoteIds.includes(medium.id) || !isLegacyReviewNotes(medium.notes)) {
					continue;
				}

				const encodedNotes = encodeReviewNotes(decodeReviewNotes(medium.notes).bubbles);
				if (encodedNotes.length === 0) {
					if (!migratedLegacyNoteIds.includes(medium.id)) {
						migratedLegacyNoteIds = [...migratedLegacyNoteIds, medium.id];
					}
					continue;
				}

				const sync_timestamp = new Date();
				const migratedCard = { ...medium, notes: encodedNotes } as mediaObject;
				const cardIndex = media_data.findIndex((entry) => entry.id === medium.id);
				if (cardIndex !== -1) {
					media_data[cardIndex] = migratedCard;
				}

				try {
					const res = await fetch('/api/v1/updateMedium', {
						method: 'POST',
						body: JSON.stringify({
							medium_fields_to_update: migratedCard,
							current_medium,
							sync_timestamp
						}),
						headers: {
							'Content-Type': 'application/json'
						}
					});
					if (!res.ok) {
						throw new Error('Review-Notizen konnten nicht synchronisiert werden.');
					}
					medium.notes = encodedNotes;
				} catch (error) {
					showSupabaseError(error, 'Review-Notizen konnten nicht synchronisiert werden.');
				}

				if (!migratedLegacyNoteIds.includes(medium.id)) {
					migratedLegacyNoteIds = [...migratedLegacyNoteIds, medium.id];
				}
			}
		} finally {
			legacyMigrationRunning = false;
		}
	}

	$: {
		const hasLegacyNotes =
			own_profile &&
			media_data.some(
				(medium) =>
					typeof medium.id === 'number' &&
					!migratedLegacyNoteIds.includes(medium.id) &&
					isLegacyReviewNotes(medium.notes)
			);
		if (hasLegacyNotes && !legacyMigrationRunning) {
			void migrateLegacyNotes();
		}
	}
</script>

<div
	bind:this={media_scroll_container}
	on:scroll={handleScroll}
	class="scrollbar-hide grow overflow-x-hidden overflow-y-auto bg-base-300 pt-2 pb-32"
>
	{#if isReloading && current_mode != 2}
		<div class="px-2 pt-3" aria-busy="true" aria-label="Medien werden geladen">
			{#each skeletonRows as _, index}
				{#if index === 0 || index === 4}
					<div class="mx-3 mt-4 mb-2 flex items-center gap-3">
						<div class="skeleton h-4 w-24 rounded"></div>
						<div class="h-px flex-1 bg-base-content/10"></div>
					</div>
				{/if}
				<div class="mb-2 flex h-[15vh] min-h-[15vh] overflow-hidden rounded-lg bg-base-100">
					<div class="skeleton h-full w-[11.25vh] shrink-0 rounded-none"></div>
					<div class="flex min-w-0 flex-1 flex-col justify-center gap-2 px-3">
						<div class="skeleton h-5 w-2/3 rounded"></div>
						<div class="skeleton h-4 w-1/2 rounded"></div>
						<div class="skeleton h-4 w-1/3 rounded"></div>
					</div>
					<div class="flex w-10 shrink-0 flex-col justify-center gap-1 pr-2">
						{#each Array(5) as _}
							<div class="skeleton h-4 w-4 rounded-full"></div>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	{:else if current_mode != 2}
		{#each media_data as medium, index (medium.id)}
			{#if separatorKeys?.[index]?.shouldRender}
				<div class="mx-3 mt-4 mb-2 flex items-center gap-3">
					{#if sorting_method.startsWith('review_score')}
						<!-- Rating separator with stars or no rating label -->
						{#if (medium.rating || 0) === 0}
							<p class="text-sm font-semibold text-base-content/70">Keine Bewertung</p>
						{:else}
							<div class="flex items-center gap-2 text-base-content/70">
								<div class="flex gap-0.5">
									{#each Array(5) as _, i}
										{@const rating = Math.round((medium.rating || 0) * 2) / 2}
										{@const starIndex = i + 1}
										<div class="h-4 w-4">
											<Star
												id={`sep-${index}-${i}`}
												fillPercentage={rating >= starIndex
													? 1
													: rating >= starIndex - 0.5
														? 0.5
														: 0}
												starConfig={{
													size: 14,
													fillColor: 'var(--color-accent)',
													strokeColor: 'var(--color-accent)',
													unfilledColor: 'var(--color-base-300)',
													strokeUnfilledColor: 'var(--color-base-300)'
												}}
												readOnly={true}
											/>
										</div>
									{/each}
								</div>
							</div>
						{/if}
					{:else}
						<!-- Text separator -->
						<p class="text-sm font-semibold text-base-content/70">{formatSeparatorLabel(medium)}</p>
					{/if}
					<div class="h-px flex-1 bg-base-content/20"></div>
				</div>
			{/if}
			{@const config = getRatingConfig(medium.rating || 0)}
			{#if current_medium === 'games'}
				<GameCard
					on:delete={askDelete}
					on:edit={showEditForm}
					on:social={openSocialModal}
					on:update_score={updateScore}
					on:update_notes={updateNotes}
					on:update_trophy={updateTrophy}
					{own_profile}
					{medium}
					{config}
					{current_mode}
				></GameCard>
			{:else if current_medium === 'movies'}
				<MovieCard
					on:delete={askDelete}
					on:edit={showEditForm}
					on:social={openSocialModal}
					on:update_score={updateScore}
					on:update_notes={updateNotes}
					on:showStreams={showProviderList}
					on:update_episode={updateEpisode}
					{own_profile}
					{medium}
					{config}
					{current_mode}
				></MovieCard>
			{:else if current_medium === 'shows'}
				<TvCard
					on:delete={askDelete}
					on:edit={showEditForm}
					on:social={openSocialModal}
					on:update_score={updateScore}
					on:update_notes={updateNotes}
					on:showStreams={showProviderList}
					{own_profile}
					{medium}
					{config}
					{current_mode}
				></TvCard>
			{:else if current_medium === 'books'}
				<BookCard
					on:delete={askDelete}
					on:edit={showEditForm}
					on:social={openSocialModal}
					on:update_score={updateScore}
					on:update_notes={updateNotes}
					{own_profile}
					{medium}
					{config}
					{current_mode}
				></BookCard>
			{/if}
		{/each}
		{#if isLoadingMore}
			<div class="flex justify-center py-6">
				<span class="loading loading-md loading-dots"></span>
			</div>
		{/if}
		<!-- Stats -->
	{:else if isReloading}
		<div class="space-y-2 px-2 pt-3" aria-busy="true" aria-label="Statistiken werden geladen">
			<div class="rounded-lg bg-base-100 p-4">
				<div class="skeleton mb-4 h-5 w-40 rounded"></div>
				<div class="space-y-3">
					<div class="skeleton h-16 w-full rounded"></div>
					<div class="skeleton h-16 w-full rounded"></div>
				</div>
			</div>
			{#each skeletonStatCards as _}
				<div class="rounded-lg bg-base-100 p-6">
					<div class="mb-4 flex items-center justify-between">
						<div class="skeleton h-4 w-36 rounded"></div>
						<div class="skeleton h-8 w-8 rounded"></div>
					</div>
					<div class="skeleton mb-4 h-10 w-20 rounded"></div>
					<div class="skeleton h-4 w-2/3 rounded"></div>
				</div>
			{/each}
		</div>
	{:else}
		{#key media_data}
			{#if media_data.length != 0}
				{#if showStatsLoadingIndicator}
					<div
						class="sticky top-2 z-10 mx-2 mb-2 rounded-lg border border-info/30 bg-base-100/95 px-4 py-3 shadow-sm backdrop-blur"
						aria-live="polite"
						aria-busy="true"
					>
						<div class="flex items-center gap-3">
							<span class="loading loading-sm loading-spinner text-info"></span>
							<div class="min-w-0">
								<p class="text-sm font-semibold">Statistiken werden vervollständigt</p>
								<p class="text-xs text-base-content/70">
									Weitere Einträge werden geladen. Die Werte können sich noch aktualisieren.
								</p>
							</div>
						</div>
					</div>
				{/if}
				<ChallengeCard
					{media_data}
					{current_medium}
					{current_year}
					{own_profile}
					{challenges}
					on:challenge_updated={(event) => dispatch('challenge_updated', event.detail)}
					on:challenge_deleted={(event) => dispatch('challenge_deleted', event.detail)}
				></ChallengeCard>
				{#if current_medium === 'games'}
					<StatCard
						{media_data}
						stat_type={'total_amount'}
						stat_title={'Anzahl der Games'}
						stat_desc={'Anzahl der gespielten Games im Zeitraum'}
					></StatCard>
					<StatCard
						{media_data}
						stat_type={'replayed_media'}
						stat_lookup_field={'igdbid'}
						stat_title={'Mehrfach gespielte Games'}
						stat_desc={'Games, die mehr als einmal gespielt wurden'}
					></StatCard>
					<StatCard
						{media_data}
						stat_type={'added_in_release_year'}
						stat_title={'Aktuelle Games'}
						stat_desc={'Games, die im Release-Jahr gespielt wurden'}
					></StatCard>
					<StatCard
						{media_data}
						stat_type={'trophy_rate'}
						stat_title={'Komplettierte Games'}
						stat_desc={'Anteil der Games, die komplettiert wurden'}
					></StatCard>
					<ChartCard
						chart_type={'activity_timeline'}
						chart_title={'Aktivität über Zeit'}
						{media_data}
						{current_year}
					></ChartCard>
					<ChartCard chart_type={'genre_bar'} chart_title={'Top Genres'} {media_data}
					></ChartCard>
					<ChartCard
						chart_type={'platform_distribution'}
						chart_title={'Plattform-Verteilung'}
						{media_data}
					></ChartCard>
					<ChartCard
						chart_type={'release_decades'}
						chart_title={'Release-Dekaden'}
						{media_data}
					></ChartCard>
					<ChartCard
						chart_type={'genre_rating'}
						chart_title={'Beste Genres nach Bewertung'}
						{media_data}
					></ChartCard>
					<ChartCard
						chart_type={'release_age'}
						chart_title={'Neu vs Klassiker'}
						{media_data}
					></ChartCard>
					<ChartCard
						chart_type={'rating_bar_user'}
						chart_title={'Deine Bewertungs-Verteilung'}
						{media_data}
					></ChartCard>
					<ChartCard
						chart_type={'rating_bar_web'}
						chart_title={'Online Bewertungs-Verteilung'}
						{media_data}
					></ChartCard>
					<ChartCard
						chart_type={'rating_difference'}
						chart_title={'Größte Rating-Abweichungen'}
						{media_data}
					></ChartCard>
					<StatCard
						{media_data}
						stat_type={'rating_difference'}
						stat_title={'Deine Meinung vs Online'}
						stat_desc={'Durchschnitt des Meinungsunterschiedes'}
					></StatCard>
					<StatCard
						{media_data}
						stat_type={'rating_below_average_percentage'}
						stat_title={'Unter dem Web-Score'}
						stat_desc={'Anteil deiner Ratings unter dem Durchschnitt'}
					></StatCard>
					<StatCard
						{media_data}
						stat_type={'rating_above_average_percentage'}
						stat_title={'Mindestens Web-Score'}
						stat_desc={'Anteil deiner Ratings auf/über dem Durchschnitt'}
					></StatCard>
					<StatCard
						{media_data}
						stat_type={'average_rating_user'}
						stat_title={'Dein Bewertungsdurchschnitt'}
						stat_desc={'Durchschnitt deiner bewerteten Games'}
					></StatCard>
					<StatCard
						{media_data}
						stat_type={'average_rating_web'}
						stat_title={'Online Bewertungsdurchschnitt'}
						stat_desc={'Durchschnitts-Score deiner gespielten Games'}
					></StatCard>
				{:else if current_medium === 'movies'}
					<StatCard
						{media_data}
						stat_type={'total_amount'}
						stat_title={'Anzahl der Filme'}
						stat_desc={'Anzahl der geschauten Filme im Zeitraum'}
					></StatCard>
					<StatCard
						{media_data}
						stat_type={'replayed_media'}
						stat_lookup_field={'tmdbid'}
						stat_title={'Mehrfach geschaut'}
						stat_desc={'Filme, die mehr als einmal geschaut wurden'}
					></StatCard>
					<StatCard
						{media_data}
						stat_type={'added_in_release_year'}
						stat_title={'Aktuelle Filme'}
						stat_desc={'Filme, die im Release-Jahr geschaut wurden'}
					></StatCard>
					<ChartCard
						chart_type={'activity_timeline'}
						chart_title={'Aktivität über Zeit'}
						{media_data}
						{current_year}
					></ChartCard>
					<ChartCard chart_type={'genre_bar'} chart_title={'Top Genres'} {media_data}
					></ChartCard>
					<ChartCard
						chart_type={'release_decades'}
						chart_title={'Release-Dekaden'}
						{media_data}
					></ChartCard>
					<ChartCard
						chart_type={'genre_rating'}
						chart_title={'Beste Genres nach Bewertung'}
						{media_data}
					></ChartCard>
					<ChartCard
						chart_type={'release_age'}
						chart_title={'Neu vs Klassiker'}
						{media_data}
					></ChartCard>
					<ChartCard
						chart_type={'rating_bar_user'}
						chart_title={'Deine Bewertungs-Verteilung'}
						{media_data}
					></ChartCard>
					<ChartCard
						chart_type={'rating_bar_web'}
						chart_title={'Online Bewertungs-Verteilung'}
						{media_data}
					></ChartCard>
					<ChartCard
						chart_type={'rating_difference'}
						chart_title={'Größte Rating-Abweichungen'}
						{media_data}
					></ChartCard>
					<StatCard
						{media_data}
						stat_type={'rating_difference'}
						stat_title={'Deine Meinung vs Online'}
						stat_desc={'Durchschnitt des Meinungsunterschiedes'}
					></StatCard>
					<StatCard
						{media_data}
						stat_type={'rating_below_average_percentage'}
						stat_title={'Unter dem Web-Score'}
						stat_desc={'Anteil deiner Ratings unter dem Durchschnitt'}
					></StatCard>
					<StatCard
						{media_data}
						stat_type={'rating_above_average_percentage'}
						stat_title={'Mindestens Web-Score'}
						stat_desc={'Anteil deiner Ratings auf/über dem Durchschnitt'}
					></StatCard>
					<StatCard
						{media_data}
						stat_type={'average_rating_user'}
						stat_title={'Dein Bewertungsdurchschnitt'}
						stat_desc={'Durchschnitt deiner bewerteten Filme'}
					></StatCard>
					<StatCard
						{media_data}
						stat_type={'average_rating_web'}
						stat_title={'Online Bewertungsdurchschnitt'}
						stat_desc={'Durchschnitts-Score deiner geschauten Filme'}
					></StatCard>
				{:else if current_medium === 'shows'}
					<StatCard
						{media_data}
						stat_type={'total_amount'}
						stat_title={'Anzahl der Staffeln'}
						stat_desc={'Anzahl der geschauten Staffeln im Zeitraum'}
					></StatCard>
					<StatCard
						{media_data}
						stat_type={'added_in_release_year'}
						stat_title={'Aktuelle Serien'}
						stat_desc={'Serien, die im Release-Jahr geschaut wurden'}
					></StatCard>
					<ChartCard
						chart_type={'activity_timeline'}
						chart_title={'Serien-Aktivität'}
						{media_data}
						{current_year}
					></ChartCard>
					<ChartCard
						chart_type={'show_logged_seasons'}
						chart_title={'Meistgeloggte Serien'}
						{media_data}
					></ChartCard>
					<ChartCard chart_type={'genre_bar'} chart_title={'Top Genres'} {media_data}
					></ChartCard>
					<ChartCard
						chart_type={'release_decades'}
						chart_title={'Release-Dekaden'}
						{media_data}
					></ChartCard>
					<ChartCard
						chart_type={'genre_rating'}
						chart_title={'Beste Genres nach Bewertung'}
						{media_data}
					></ChartCard>
					<ChartCard
						chart_type={'release_age'}
						chart_title={'Aktuelle vs ältere Staffeln'}
						{media_data}
					></ChartCard>
					<ChartCard
						chart_type={'rating_bar_user'}
						chart_title={'Deine Bewertungs-Verteilung'}
						{media_data}
					></ChartCard>
					<ChartCard
						chart_type={'rating_bar_web'}
						chart_title={'Online Bewertungs-Verteilung'}
						{media_data}
					></ChartCard>
					<ChartCard
						chart_type={'rating_difference'}
						chart_title={'Größte Rating-Abweichungen'}
						{media_data}
					></ChartCard>
					<StatCard
						{media_data}
						stat_type={'rating_difference'}
						stat_title={'Deine Meinung vs Online'}
						stat_desc={'Durchschnitt des Meinungsunterschiedes'}
					></StatCard>
					<StatCard
						{media_data}
						stat_type={'rating_below_average_percentage'}
						stat_title={'Unter dem Web-Score'}
						stat_desc={'Anteil deiner Ratings unter dem Durchschnitt'}
					></StatCard>
					<StatCard
						{media_data}
						stat_type={'rating_above_average_percentage'}
						stat_title={'Mindestens Web-Score'}
						stat_desc={'Anteil deiner Ratings auf/über dem Durchschnitt'}
					></StatCard>
					<StatCard
						{media_data}
						stat_type={'average_rating_user'}
						stat_title={'Dein Bewertungsdurchschnitt'}
						stat_desc={'Durchschnitt deiner bewerteten Serien'}
					></StatCard>
					<StatCard
						{media_data}
						stat_type={'average_rating_web'}
						stat_title={'Online Bewertungsdurchschnitt'}
						stat_desc={'Durchschnitts-Score deiner geschauten Serien'}
					></StatCard>
				{:else if current_medium === 'books'}
					<StatCard
						{media_data}
						stat_type={'total_amount'}
						stat_title={'Anzahl der Bücher'}
						stat_desc={'Anzahl der gelesenen Bücher im Zeitraum'}
					></StatCard>
					<StatCard
						{media_data}
						stat_type={'replayed_media'}
						stat_lookup_field={'gbid'}
						stat_title={'Mehrfach gelesen'}
						stat_desc={'Bücher, die mehr als einmal gelesen wurden'}
					></StatCard>
					<StatCard
						{media_data}
						stat_type={'added_in_release_year'}
						stat_title={'Aktuelle Bücher'}
						stat_desc={'Bücher, die im Release-Jahr gelesen wurden'}
					></StatCard>
					<StatCard
						{media_data}
						stat_type={'page_count'}
						stat_title={'Gelesene Seiten'}
						stat_desc={'Anzahl deiner gelesenen Seiten'}
					></StatCard>
					<ChartCard
						chart_type={'activity_timeline'}
						chart_title={'Aktivität über Zeit'}
						{media_data}
						{current_year}
					></ChartCard>
					<ChartCard chart_type={'genre_bar'} chart_title={'Top Genres'} {media_data}
					></ChartCard>
					<ChartCard
						chart_type={'top_authors'}
						chart_title={'Top Autor:innen'}
						{media_data}
					></ChartCard>
					<ChartCard
						chart_type={'release_decades'}
						chart_title={'Release-Dekaden'}
						{media_data}
					></ChartCard>
					<ChartCard
						chart_type={'genre_rating'}
						chart_title={'Beste Genres nach Bewertung'}
						{media_data}
					></ChartCard>
					<ChartCard
						chart_type={'release_age'}
						chart_title={'Neu vs Klassiker'}
						{media_data}
					></ChartCard>
					<ChartCard
						chart_type={'pages_over_time'}
						chart_title={'Seiten über Zeit'}
						{media_data}
						{current_year}
					></ChartCard>
					<ChartCard
						chart_type={'page_distribution'}
						chart_title={'Seiten-Verteilung'}
						{media_data}
					></ChartCard>
					<ChartCard
						chart_type={'genre_pages'}
						chart_title={'Seitenanteil nach Genre'}
						{media_data}
					></ChartCard>
					<ChartCard
						chart_type={'rating_bar_user'}
						chart_title={'Deine Bewertungs-Verteilung'}
						{media_data}
					></ChartCard>
					<ChartCard
						chart_type={'rating_difference'}
						chart_title={'Größte Rating-Abweichungen'}
						{media_data}
					></ChartCard>
					<StatCard
						{media_data}
						stat_type={'average_rating_user'}
						stat_title={'Dein Bewertungsdurchschnitt'}
						stat_desc={'Durchschnitt deiner bewerteten Bücher'}
					></StatCard>
					<StatCard
						{media_data}
						stat_type={'rating_below_average_percentage'}
						stat_title={'Unter dem Web-Score'}
						stat_desc={'Anteil deiner Ratings unter dem Durchschnitt'}
					></StatCard>
					<StatCard
						{media_data}
						stat_type={'rating_above_average_percentage'}
						stat_title={'Mindestens Web-Score'}
						stat_desc={'Anteil deiner Ratings auf/über dem Durchschnitt'}
					></StatCard>
					<StatCard
						{media_data}
						stat_type={'author_count'}
						stat_title={'Autoren'}
						stat_desc={'Anzahl an verschiedenen Autoren'}
					></StatCard>
				{/if}
			{/if}
		{/key}
	{/if}
</div>
<!-- Social Modal -->
<input type="checkbox" id="social_modal" class="modal-toggle" bind:this={social_modal} />
<div class="modal" role="dialog">
	<div class="scrollbar-hide modal-box max-h-[85dvh] max-w-3xl overflow-y-auto">
		<p class="mb-1 text-xl font-bold">Social</p>
		{#if social_medium?.title}
			<p class="mb-4 text-lg text-base-content/70">{social_medium.title}</p>
		{/if}

		{#if social_error}
			<div class="mb-3 alert alert-error">
				<span>{social_error}</span>
			</div>
		{/if}

		{#if social_loading}
			<div class="flex items-center justify-center py-6">
				<span class="loading loading-md loading-spinner"></span>
			</div>
		{:else}
			<div class="grid gap-4 md:grid-cols-2">
				<div class="rounded-lg border border-base-content/15 p-3">
					<p class="mb-2 text-sm font-semibold">
						{'Bereits ' +
							(current_medium === 'games'
								? 'gespielt'
								: current_medium === 'books'
									? 'gelesen'
									: 'geschaut')}
					</p>
					{#if social_consumed.length === 0}
						<p class="text-sm text-base-content/70">Niemand aus deinen Followings.</p>
					{:else}
						<div class="space-y-2">
							{#each social_consumed as user (user.user_id)}
								<button
									type="button"
									class="btn w-full justify-between btn-ghost"
									on:click={() => navigateToUserEntry(user)}
								>
									<span class="min-w-0 flex-1 truncate" title={`@${user.username}`}>@{user.username}</span>
									<span class="text-xs opacity-70">Eintrag anzeigen</span>
								</button>
							{/each}
						</div>
					{/if}
				</div>

				<div class="rounded-lg border border-base-content/15 p-3">
					<p class="mb-2 text-sm font-semibold">Bereits im Backlog</p>
					{#if social_backlog.length === 0}
						<p class="text-sm text-base-content/70">Niemand aus deinen Followings.</p>
					{:else}
						<div class="space-y-2">
							{#each social_backlog as user (user.user_id)}
								<button
									type="button"
									class="btn w-full justify-between btn-ghost"
									on:click={() => navigateToUserEntry(user)}
								>
									<span class="min-w-0 flex-1 truncate" title={`@${user.username}`}>@{user.username}</span>
									<span class="text-xs opacity-70">Eintrag anzeigen</span>
								</button>
							{/each}
						</div>
					{/if}
				</div>
			</div>

			<div class="mt-4 rounded-lg border border-base-content/15 p-3">
				<p class="mb-2 text-sm font-semibold">Empfehlung senden</p>
				<textarea
					class="textarea-bordered textarea mb-3 w-full"
					placeholder="Optionale Nachricht"
					bind:value={social_message}
				></textarea>
				{#if social_eligible.length === 0}
					<p class="text-sm text-base-content/70">
						Keine passenden Followings gefunden, die den Titel noch nicht kennen.
					</p>
				{:else}
					<div class="space-y-2">
						{#each social_eligible as user (user.user_id)}
							<div class="flex items-center justify-between rounded bg-base-200 px-3 py-2">
								<span class="min-w-0 flex-1 truncate" title={`@${user.username}`}>@{user.username}</span>
								<button
									type="button"
									class="btn btn-sm btn-primary"
									disabled={social_sending || !!user.hasPendingRecommendation}
									on:click={() => sendRecommendation(user)}
								>
									{#if user.hasPendingRecommendation}
										Bereits empfohlen
									{:else if social_sending && social_sending_username === user.username}
										Senden...
									{:else}
										Empfehlen
									{/if}
								</button>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		{/if}
	</div>
	<button
		type="button"
		on:click={() => {
			social_modal.checked = false;
		}}
		class="modal-backdrop"
	>
		Close
	</button>
</div>
<!-- DeleteModal -->
<input type="checkbox" id="delete_modal" class="modal-toggle" bind:this={delete_modal} />
<div class="modal" role="dialog">
	<div class="modal-box flex flex-col">
		<p class="mb-3 text-lg font-semibold">{to_delete.title} wirklich löschen?</p>
		<button
			class="btn font-bold btn-error"
			on:click={() => {
				dispatch('delete', to_delete);
				delete_modal.checked = false;
			}}>Löschen</button
		>
	</div>
	<button
		type="button"
		on:click={() => {
			delete_modal.checked = false;
		}}
		class="modal-backdrop">Close</button
	>
</div>
<!-- Edit_modal -->
<input type="checkbox" id="edit_modal" class="modal-toggle" bind:this={edit_modal} />
<div class="modal overflow-y-auto" role="dialog">
	<div
		class="scrollbar-hide modal-box my-[4dvh] flex max-h-[80dvh] w-[94vw] max-w-2xl flex-col gap-4 overflow-y-auto rounded-2xl border border-base-content/10 bg-base-100 p-4 sm:p-6"
	>
		<div class="mb-1">
			<p class="text-lg font-bold">Eintrag bearbeiten</p>
		</div>
		<div class="grid gap-4 sm:grid-cols-2">
			<!-- Added-Date -->
			<div class="w-full">
				<div class="w-full p-2">
					<WheelDatePicker
						bind:value={to_editAdded}
						max={new Date()}
						min={new Date(1888, 9, 14)}
						label="Hinzugefügt am"
						className="w-full"
					/>
				</div>
			</div>
			<!-- Trophy -->
			{#if current_medium === 'games'}
				<label
					class="flex cursor-pointer items-center gap-3 rounded-xl border border-base-content/10 bg-base-100 p-3"
				>
					<input type="checkbox" bind:checked={to_editTrophy} class="checkbox checkbox-accent" />
					<div class="flex flex-col">
						<span class="font-medium">Komplettiert</span>
						<span class="text-xs opacity-65">Entspricht dem Trophy-Status der GameCard.</span>
					</div>
				</label>
			{/if}
			<!-- Staffel / Episode -->
			{#if current_medium === 'shows'}
				<div class="w-full">
					<div class="label pb-1">
						<span class="label-text font-medium">Staffel von</span>
					</div>
					<input
						type="number"
						min="1"
						step="1"
						bind:value={to_editSeasonStart}
						class="ml-input"
						placeholder="z.B. 1"
					/>
				</div>
				<div class="w-full">
					<div class="label pb-1">
						<span class="label-text font-medium">Staffel bis</span>
					</div>
					<input
						type="number"
						min="1"
						step="1"
						bind:value={to_editSeasonEnd}
						class="ml-input"
						placeholder="optional"
					/>
				</div>
				<div class="w-full sm:col-span-2">
					<div class="label pb-1">
						<span class="label-text font-medium">Aktuelle Episode</span>
					</div>
					<div class="ml-section flex items-center justify-between gap-2 p-2">
						<button
							type="button"
							class="btn h-9 min-h-9 w-12 btn-sm"
							on:click={() => (to_editEpisode = Math.max(to_editEpisode - 1, 0))}
						>
							-
						</button>
						<input
							type="number"
							min="0"
							step="1"
							bind:value={to_editEpisode}
							class="ml-input w-full text-center"
						/>
						<button
							type="button"
							class="btn h-9 min-h-9 w-12 btn-sm"
							on:click={() => (to_editEpisode = to_editEpisode + 1)}
						>
							+
						</button>
					</div>
					<p class="mt-1 text-xs opacity-65">Wird als Zahl gespeichert, nie kleiner als 0.</p>
				</div>
			{/if}
		</div>

		<div class="shrink-0 overflow-hidden rounded-2xl border border-base-content/10 bg-base-200/50">
			<button
				type="button"
				class="flex min-h-12 w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold"
				on:click={() => (show_advanced_fields = !show_advanced_fields)}
			>
				<span>Erweiterte Felder</span>
				<span class="text-base-content/70">{show_advanced_fields ? '−' : '+'}</span>
			</button>
			{#if show_advanced_fields}
				<div class="space-y-3 px-4 pt-1 pb-4">
					<div class="rounded-xl border border-base-content/10 bg-base-200/50 p-3">
						<p class="font-medium">Eintrag durch Suchergebnis ersetzen</p>
						<p class="mt-1 text-xs opacity-70">
							Übernimmt Titel, Cover und weitere Metadaten. Deine Bewertung, Notizen,
							Fortschritt und das Hinzufügedatum bleiben erhalten.
						</p>
						<div class="mt-3 space-y-2">
							<input
								type="search"
								class="ml-input"
								placeholder="Neuen Titel suchen"
								bind:value={replacementSearchValue}
								on:input={scheduleReplacementSearch}
							/>
							{#if current_medium === 'books'}
								<input
									type="search"
									class="ml-input"
									placeholder="Autor eingrenzen (optional)"
									bind:value={replacementSearchAuthor}
									on:input={scheduleReplacementSearch}
								/>
							{/if}
						</div>
						{#if replacementSearchLoading}
							<div class="mt-3 flex justify-center"><span class="loading loading-sm loading-dots"></span></div>
						{:else if replacementSearchError}
							<p class="mt-2 text-xs text-error">{replacementSearchError}</p>
						{:else if replacementSuggestions.length > 0}
							<div class="mt-3 max-h-56 space-y-2 overflow-y-auto">
								{#each replacementSuggestions as suggestion (suggestion.igdbid || suggestion.tmdbid || suggestion.gbid || suggestion.title)}
									<button
										type="button"
										class="btn h-auto min-h-0 w-full justify-start whitespace-normal py-2 text-left"
										on:click={() => replaceMetadata(suggestion)}
									>
										<img
											src={suggestion.image || '/placeholder.png'}
											alt=""
											class="h-12 w-8 shrink-0 rounded object-cover bg-base-200"
											on:error={usePlaceholderImage}
										/>
										<span class="min-w-0">
											<span class="block line-clamp-1 font-semibold">{suggestion.title}</span>
											<span class="block line-clamp-1 text-xs font-normal opacity-70">
												{new Date(suggestion.release || '').getFullYear() || 'Unbekannt'}
												{suggestion.author ? ` · ${suggestion.author}` : ''}
											</span>
										</span>
									</button>
								{/each}
							</div>
						{/if}
					</div>
					<!-- Titel -->
					<label class="w-full sm:col-span-2">
						<div class="label pb-1">
							<span class="label-text font-medium">Titel</span>
						</div>
						<div class="w-full p-2">
							<input type="text" bind:value={to_edit.title} class="ml-input" />
						</div>
					</label>
					<!-- Autor -->
					{#if current_medium === 'books'}
						<label class="form-control w-full">
							<div class="label pb-1">
								<span class="label-text font-medium">Autor</span>
							</div>
							<input type="text" bind:value={to_edit.author} class="ml-input" />
						</label>
						<label class="form-control w-full">
							<div class="label pb-1">
								<span class="label-text font-medium">Seitenzahl</span>
							</div>
							<input
								type="number"
								min="0"
								step="1"
								bind:value={to_edit.pagecount}
								class="ml-input"
							/>
						</label>
					{/if}
					<!-- Release -->
					<div class="w-full">
						<div class="w-full p-2">
							<WheelDatePicker
								bind:value={to_editRelease}
								max={new Date()}
								min={new Date(1888, 9, 14)}
								label="Release-Datum"
								className="w-full"
							/>
						</div>
					</div>
					<!-- Genre-Tags -->
					<div class="sm:col-span-2">
						<TagInput
							label="Genres"
							bind:value={to_editGenreTags}
							suggestions={genreSuggestions}
							placeholder="Genre auswählen oder selbst eingeben"
						/>
					</div>
					<!-- Platform-Tags -->
					{#if current_medium === 'games'}
						<div class="sm:col-span-2">
							<TagInput
								label="Plattformen"
								bind:value={to_editPlatformTags}
								suggestions={platformSuggestions}
								placeholder="Plattform auswählen oder selbst eingeben"
							/>
						</div>
					{/if}
					<!-- Bild-URL -->
					<label class="form-control w-full">
						<div class="label pb-1">
							<span class="label-text font-medium">Bild-URL</span>
						</div>
						<input
							type="url"
							bind:value={to_edit.image}
							class="ml-input"
							placeholder="https://..."
						/>
						<p class="mt-1 text-xs opacity-65">
							Nur anpassen, wenn du bewusst ein anderes Cover verwenden willst.
						</p>
					</label>
				</div>
			{/if}
		</div>

		<button class="btn mt-3 font-bold btn-success" on:click={updateMedium}
			>Änderungen speichern</button
		>
	</div>
	<button
		type="button"
		on:click={() => {
			edit_modal.checked = false;
		}}
		class="modal-backdrop -z-10">Close</button
	>
</div>
<!-- Streaming Provider Modal -->
<input type="checkbox" id="streaming_modal" class="modal-toggle" bind:this={streaming_modal} />
<div class="modal" role="dialog">
	<div class="scrollbar-hide modal-box flex max-h-[80dvh] flex-col overflow-y-auto">
		<div class="mb-4 flex flex-row">
			<p class=" justify-center text-2xl font-bold">Wo streamen?</p>
			<div class="flex h-6 w-1/2 justify-end">
				<JustWatch_Logo></JustWatch_Logo>
			</div>
		</div>
		{#if streaming_data.flatrate === undefined && streaming_data.ads === undefined && streaming_data.buy === undefined}
			<p class="mb-3 text-2xl font-semibold">Keine Streamingdienste gefunden</p>
		{:else}
			{#if streaming_data.flatrate}
				<p class="my-3 text-xl font-semibold">Streaming</p>
				<div class="grid grid-cols-4 gap-4">
					{#each streaming_data.flatrate as flat}
						<img
							src="https://image.tmdb.org/t/p/w154{flat.logo_path}"
							class="h-14"
							alt={flat.provider_name}
						/>
					{/each}
				</div>
			{/if}
			{#if streaming_data.ads}
				<p class="my-3 text-xl font-semibold">Streaming mit Werbung</p>
				<div class="grid grid-cols-4 gap-4">
					{#each streaming_data.ads as ad}
						<img
							src="https://image.tmdb.org/t/p/w154{ad.logo_path}"
							class="h-14"
							alt={ad.provider_name}
						/>
					{/each}
				</div>
			{/if}
			{#if streaming_data.rent}
				<p class="my-3 text-xl font-semibold">Leihen</p>
				<div class="grid grid-cols-4 gap-4">
					{#each streaming_data.rent as r}
						<img
							src="https://image.tmdb.org/t/p/w154{r.logo_path}"
							class="h-14"
							alt={r.provider_name}
						/>
					{/each}
				</div>
			{/if}
			{#if streaming_data.buy}
				<p class="my-3 text-xl font-semibold">Kaufen</p>
				<div class="grid grid-cols-4 gap-4">
					{#each streaming_data.buy as b}
						<img
							src="https://image.tmdb.org/t/p/w154{b.logo_path}"
							class="h-14 overflow-hidden rounded-lg"
							alt={b.provider_name}
						/>
					{/each}
				</div>
			{/if}
		{/if}
	</div>
	<button
		type="button"
		on:click={() => {
			streaming_modal.checked = false;
			streaming_data = {};
		}}
		class="modal-backdrop -z-20">Close</button
	>
</div>
