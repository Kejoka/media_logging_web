<script lang="ts">
	import JustWatch_Logo from '../../Icons/justwatch.svelte';
	import TvCard from './tvCard.svelte';
	import {
		dexieDB,
		redoDexieChanges,
		type mediaObject,
		type OfflineChangeObject
	} from '$lib/dbUtils';
	import { createEventDispatcher } from 'svelte';
	import GameCard from './gameCard.svelte';
	import MovieCard from './movieCard.svelte';
	import BookCard from './bookCard.svelte';
	import { DateInput } from 'date-picker-svelte';
	import StatCard from './statCard.svelte';
	import ChartCard from './chartCard.svelte';
	import ChallengeCard from './challengeCard.svelte';
	import Star from '../Stars_modified/Star.svelte';
	import type { SortingMethod, UserChallenge } from '$lib/types';
	export let media_data: mediaObject[];
	export let current_medium: string;
	export let current_mode: number;
	export let own_profile: boolean;
	export let current_year: string;
	export let sorting_method: SortingMethod = 'date_added_desc';
	export let challenges: UserChallenge[] = [];
	let delete_modal: HTMLInputElement;
	let streaming_modal: HTMLInputElement;
	let edit_modal: HTMLInputElement;
	let to_delete: mediaObject = { title: '' };
	let to_edit: mediaObject = { title: '' };
	let original_to_edit_release: string | null = null;
	let original_to_edit_added: string | null = null;
	let to_editRelease: Date = new Date();
	let to_editAdded: Date = new Date();
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
	const dispatch = createEventDispatcher();
	const monthFormatter = new Intl.DateTimeFormat('de-DE', { month: 'long' });

	// Determine if we're in a year-specific view or "Gesamt" (all years)
	$: isYearSpecific = current_year !== 'Gesamt' && Number.isFinite(Number(current_year));

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
		console.log(media_data[index], media_data[index - 1]);
		console.log(
			`[${index}] Current: ${currentKey} | Previous: ${previousKey} | Render: ${shouldRender}`
		);
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

	async function updateScore(event: CustomEvent) {
		try {
			const sync_timestamp = new Date();
			// DexieDB
			switch (current_medium) {
				case 'games':
					await dexieDB.games.update(event.detail.medium.id, { rating: event.detail.new_score });
					break;
				case 'movies':
					await dexieDB.movies.update(event.detail.medium.id, { rating: event.detail.new_score });
					break;
				case 'shows':
					await dexieDB.shows.update(event.detail.medium.id, { rating: event.detail.new_score });
					break;
				case 'books':
					await dexieDB.books.update(event.detail.medium.id, { rating: event.detail.new_score });
					break;
				default:
					break;
			}
			media_data[media_data.findIndex((obj) => obj.id == event.detail.medium.id)].rating =
				event.detail.new_score;
			await dexieDB.prefs.update(0, { updated_at: sync_timestamp.toISOString() });
			// Supabase
			try {
				const dexie_prefs = (await dexieDB.prefs.toArray()).at(0);
				if (JSON.parse(dexie_prefs?.changed_offline || '').length != 0) {
					redoDexieChanges();
				}
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
			} catch (error) {
				console.log(error);
				let dexie_prefs = (await dexieDB.prefs.toArray()).at(0);
				if (dexie_prefs) {
					if (!navigator.onLine) {
						const tmp: OfflineChangeObject[] = JSON.parse(dexie_prefs.changed_offline);
						tmp.push({
							event: 'score',
							medium: current_medium,
							card: { id: event.detail.medium.id, rating: event.detail.new_score } as mediaObject
						});
						dexie_prefs.changed_offline = JSON.stringify(tmp);
					}
					dexie_prefs.updated_at = sync_timestamp.toISOString();
					await dexieDB.prefs.update(0, dexie_prefs);
				}
			}
		} catch (error) {
			console.log(error);
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
		edit_modal.checked = true;
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
			const data = (await res.json()) as { results: { DE: typeof streaming_data } };
			streaming_data = data.results.DE;
			streaming_modal.checked = true;
		} catch (error) {
			console.log(error);
		}
	}

	async function updateMedium() {
		const releaseFromPicker = toIsoOrFallback(to_editRelease, original_to_edit_release);
		const addedFromPicker = toIsoOrFallback(to_editAdded, original_to_edit_added);

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
		media_data[media_data.findIndex((obj) => obj.id == to_edit.id)] = to_edit;
		const sync_timestamp = new Date();
		// DexieDB
		switch (current_medium) {
			case 'games':
				await dexieDB.games.update(to_edit.id, {
					title:
						to_edit.title && to_edit.title.trim().length > 0
							? to_edit.title.trim()
							: 'Kein Titel angegeben',
					image: to_edit.image && to_edit.image.trim().length > 0 ? to_edit.image.trim() : null,
					release:
						to_edit.release && to_edit.release.trim().length > 0 ? to_edit.release.trim() : null,
					genres: to_edit.genres && to_edit.genres.trim().length > 0 ? to_edit.genres.trim() : null,
					platforms:
						to_edit.platforms && to_edit.platforms.trim().length > 0
							? to_edit.platforms.trim()
							: null,
					added:
						to_edit.added && to_edit.added.trim().length > 0
							? to_edit.added.trim()
							: new Date().toISOString(),
					notes: to_edit.notes && to_edit.notes.trim().length > 0 ? to_edit.notes.trim() : null
				} as mediaObject);
				break;
			case 'movies':
				await dexieDB.movies.update(to_edit.id, {
					title:
						to_edit.title && to_edit.title.trim().length > 0
							? to_edit.title.trim()
							: 'Kein Titel angegeben',
					image: to_edit.image && to_edit.image.trim().length > 0 ? to_edit.image.trim() : null,
					release:
						to_edit.release && to_edit.release.trim().length > 0 ? to_edit.release.trim() : null,
					genres: to_edit.genres && to_edit.genres.trim().length > 0 ? to_edit.genres.trim() : null,
					added:
						to_edit.added && to_edit.added.trim().length > 0
							? to_edit.added.trim()
							: new Date().toISOString(),
					notes: to_edit.notes && to_edit.notes.trim().length > 0 ? to_edit.notes.trim() : null
				} as mediaObject);
				break;
			case 'shows':
				await dexieDB.shows.update(to_edit.id, {
					title:
						to_edit.title && to_edit.title.trim().length > 0
							? to_edit.title
							: 'Kein Titel angegeben',
					image: to_edit.image && to_edit.image.trim().length > 0 ? to_edit.image : null,
					release: to_edit.release && to_edit.release.trim().length > 0 ? to_edit.release : null,
					genres: to_edit.genres && to_edit.genres.trim().length > 0 ? to_edit.genres : null,
					added:
						to_edit.added && to_edit.added.trim().length > 0
							? to_edit.added
							: new Date().toISOString(),
					notes: to_edit.notes && to_edit.notes.trim().length > 0 ? to_edit.notes : null,
					seasons: to_edit.seasons && to_edit.seasons.trim().length > 0 ? to_edit.seasons : null,
					episode:
						to_edit.episode && to_edit.episode.toString().trim().length > 0 ? to_edit.episode : 0
				} as mediaObject);
				break;
			case 'books':
				await dexieDB.books.update(to_edit.id, {
					title:
						to_edit.title && to_edit.title.trim().length > 0
							? to_edit.title
							: 'Kein Titel angegeben',
					author: to_edit.author && to_edit.author.trim().length > 0 ? to_edit.author : null,
					image: to_edit.image && to_edit.image.trim().length > 0 ? to_edit.image : null,
					release: to_edit.release && to_edit.release.trim().length > 0 ? to_edit.release : null,
					genres: to_edit.genres && to_edit.genres.trim().length > 0 ? to_edit.genres : null,
					pagecount:
						to_edit.pagecount && to_edit.pagecount.toString().trim().length > 0
							? to_edit.pagecount
							: null,
					added:
						to_edit.added && to_edit.added.trim().length > 0
							? to_edit.added
							: new Date().toISOString(),
					notes: to_edit.notes && to_edit.notes.trim().length > 0 ? to_edit.notes : null
				} as mediaObject);
				break;
			default:
				break;
		}
		await dexieDB.prefs.update(0, { updated_at: sync_timestamp.toISOString() });
		// Supabase
		try {
			const dexie_prefs = (await dexieDB.prefs.toArray()).at(0);
			if (JSON.parse(dexie_prefs?.changed_offline || '').length != 0) {
				redoDexieChanges();
			}
			const res = await fetch('/api/v1/updateMedium', {
				method: 'POST',
				body: JSON.stringify({ to_edit, current_medium, sync_timestamp }),
				headers: {
					'Content-Type': 'application/json'
				}
			});
		} catch (error) {
			console.log(error);
			let dexie_prefs = (await dexieDB.prefs.toArray()).at(0);
			if (dexie_prefs) {
				if (!navigator.onLine) {
					const tmp: OfflineChangeObject[] = JSON.parse(dexie_prefs.changed_offline);
					tmp.push({ event: 'update', medium: current_medium, card: to_edit });
					dexie_prefs.changed_offline = JSON.stringify(tmp);
				}
				dexie_prefs.updated_at = sync_timestamp.toISOString();
				await dexieDB.prefs.update(0, dexie_prefs);
			}
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
</script>

<div class="scrollbar-hide grow overflow-x-hidden overflow-y-auto bg-base-300 pt-2">
	{#if current_mode != 2}
		{#each media_data as medium, index (medium.id)}
			{#if separatorKeys[index].shouldRender}
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
					on:update_score={updateScore}
					{own_profile}
					{medium}
					{config}
					{current_mode}
				></GameCard>
			{:else if current_medium === 'movies'}
				<MovieCard
					on:delete={askDelete}
					on:edit={showEditForm}
					on:update_score={updateScore}
					on:showStreams={showProviderList}
					{own_profile}
					{medium}
					{config}
					{current_mode}
				></MovieCard>
			{:else if current_medium === 'shows'}
				<TvCard
					on:delete={askDelete}
					on:edit={showEditForm}
					on:update_score={updateScore}
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
					on:update_score={updateScore}
					{own_profile}
					{medium}
					{config}
					{current_mode}
				></BookCard>
			{/if}
		{/each}
		<!-- Stats -->
	{:else}
		{#key media_data}
			{#if media_data.length != 0}
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
					<ChartCard chart_type={'genre_pie'} chart_title={'Genre-Verteilung'} {media_data}
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
					<StatCard
						{media_data}
						stat_type={'rating_difference'}
						stat_title={'Deine Meinung vs Online'}
						stat_desc={'Durchschnitt des Meinungsunterschiedes'}
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
						stat_type={'added_in_release_year'}
						stat_title={'Aktuelle Filme'}
						stat_desc={'Filme, die im Release-Jahr geschaut wurden'}
					></StatCard>
					<ChartCard chart_type={'genre_pie'} chart_title={'Genre-Verteilung'} {media_data}
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
					<StatCard
						{media_data}
						stat_type={'rating_difference'}
						stat_title={'Deine Meinung vs Online'}
						stat_desc={'Durchschnitt des Meinungsunterschiedes'}
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
					<ChartCard chart_type={'genre_pie'} chart_title={'Genre-Verteilung'} {media_data}
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
					<StatCard
						{media_data}
						stat_type={'rating_difference'}
						stat_title={'Deine Meinung vs Online'}
						stat_desc={'Durchschnitt des Meinungsunterschiedes'}
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
						chart_type={'rating_bar_user'}
						chart_title={'Deine Bewertungs-Verteilung'}
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
						stat_type={'author_count'}
						stat_title={'Autoren'}
						stat_desc={'Anzahl an verschiedenen Autoren'}
					></StatCard>
					<ChartCard chart_type={'genre_pie'} chart_title={'Genre-Verteilung'} {media_data}
					></ChartCard>
				{/if}
			{/if}
		{/key}
	{/if}
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
<div class="modal" role="dialog">
	<div class="modal-box flex flex-col justify-evenly">
		<!-- Title -->
		<label class="form-control w-full max-w-xs">
			<div class="label">
				<span class="label-text">Titel</span>
			</div>
			<input type="text" bind:value={to_edit.title} class="input-bordered input w-full max-w-xs" />
		</label>
		<!-- Image -->
		<label class="form-control w-full max-w-xs">
			<div class="label">
				<span class="label-text">Bild-URL</span>
			</div>
			<input type="text" bind:value={to_edit.image} class="input-bordered input w-full max-w-xs" />
		</label>
		<!-- Release  -->
		<div class="label">
			<span class="label-text">Release-Datum</span>
		</div>
		<DateInput bind:value={to_editRelease} />
		<!-- Genres -->
		<label class="form-control w-full max-w-xs">
			<div class="label">
				<span class="label-text">Genre-Liste</span>
			</div>
			<input type="text" bind:value={to_edit.genres} class="input-bordered input w-full max-w-xs" />
		</label>
		<!-- Added -->
		<div class="label">
			<span class="label-text">Hinzugefügt</span>
		</div>
		<DateInput bind:value={to_editAdded} />
		<!-- Review -->
		<label class="form-control">
			<div class="label">
				<span class="label-text">Review</span>
			</div>
			<textarea class="textarea-bordered textarea h-24" bind:value={to_edit.notes}></textarea>
		</label>
		{#if current_medium === 'games'}
			<!-- Platforms	 -->
			<label class="form-control w-full max-w-xs">
				<div class="label">
					<span class="label-text">Plattform-Liste</span>
				</div>
				<input
					type="text"
					bind:value={to_edit.platforms}
					class="input-bordered input w-full max-w-xs"
				/>
			</label>
		{:else if current_medium === 'shows'}
			<!-- Staffeln	 -->
			<label class="form-control w-full max-w-xs">
				<div class="label">
					<span class="label-text">Staffeln</span>
				</div>
				<input
					type="text"
					bind:value={to_edit.seasons}
					class="input-bordered input w-full max-w-xs"
				/>
			</label>
			<!-- Episoden	 -->
			<label class="form-control w-full max-w-xs">
				<div class="label">
					<span class="label-text">Episode</span>
				</div>
				<input
					type="text"
					bind:value={to_edit.episode}
					class="input-bordered input w-full max-w-xs"
				/>
			</label>
		{:else if current_medium === 'books'}
			<!-- Author	 -->
			<label class="form-control w-full max-w-xs">
				<div class="label">
					<span class="label-text">Autor</span>
				</div>
				<input
					type="text"
					bind:value={to_edit.author}
					class="input-bordered input w-full max-w-xs"
				/>
			</label>
			<!-- pagecount	 -->
			<label class="form-control w-full max-w-xs">
				<div class="label">
					<span class="label-text">Seitenzahl</span>
				</div>
				<input
					type="text"
					bind:value={to_edit.pagecount}
					class="input-bordered input w-full max-w-xs"
				/>
			</label>
		{/if}
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
	<div class="modal-box flex max-h-[65%] flex-col">
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
