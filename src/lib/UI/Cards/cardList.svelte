<script lang="ts">
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
	import { tap } from 'svelte-gestures';
	import StatCard from './statCard.svelte';
	import ChartCard from './chartCard.svelte';
	export let media_data: mediaObject[];
	export let current_medium: string;
	export let current_mode: number;
	export let own_profile: boolean;
	let deleteModal: HTMLInputElement;
	let edit_modal: HTMLInputElement;
	let toDelete: mediaObject = { title: '' };
	let toEdit: mediaObject = { title: '' };
	let toEditRelease: Date = new Date();
	let toEditAdded: Date = new Date();
	const dispatch = createEventDispatcher();

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
				fillColor: 'var(--fallback-a,oklch(var(--a)/var(--tw-bg-opacity)))',
				strokeColor: 'var(--fallback-a,oklch(var(--a)/var(--tw-bg-opacity)))',
				unfilledColor: 'var(--fallback-b2,oklch(var(--b3)/var(--tw-bg-opacity)))',
				strokeUnfilledColor: 'var(--fallback-b3,oklch(var(--b3)/var(--tw-bg-opacity)))'
			}
		};
	}

	async function updateScore(event: CustomEvent) {
		try {
			const syncTimestamp = new Date();
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
			await dexieDB.prefs.update(0, { updated_at: syncTimestamp.toISOString() });
			// Supabase
			try {
				const dexiePrefs = (await dexieDB.prefs.toArray()).at(0);
				if (JSON.parse(dexiePrefs?.changed_offline || '').length != 0) {
					redoDexieChanges();
				}
				const res = await fetch('/api/v1/updateScore', {
					method: 'POST',
					body: JSON.stringify({
						score: event.detail.new_score,
						medium: event.detail.medium,
						current_medium,
						syncTimestamp
					}),
					headers: {
						'Content-Type': 'application/json'
					}
				});
			} catch (error) {
				console.log(error);
				let dexiePrefs = (await dexieDB.prefs.toArray()).at(0);
				if (dexiePrefs) {
					if (!navigator.onLine) {
						const tmp: OfflineChangeObject[] = JSON.parse(dexiePrefs.changed_offline);
						tmp.push({
							event: 'score',
							medium: current_medium,
							card: { id: event.detail.medium.id, rating: event.detail.new_score } as mediaObject
						});
						dexiePrefs.changed_offline = JSON.stringify(tmp);
					}
					dexiePrefs.updated_at = syncTimestamp.toISOString();
					await dexieDB.prefs.update(0, dexiePrefs);
				}
			}
		} catch (error) {
			console.log(error);
		}
	}

	function askDelete(event: CustomEvent) {
		toDelete = event.detail;
		deleteModal.checked = true;
	}

	function showEditForm(event: CustomEvent) {
		toEdit = event.detail;
		toEditRelease = new Date(toEdit.release || '');
		toEditAdded = new Date(toEdit.added || '');
		edit_modal.checked = true;
	}

	async function updateMedium() {
		media_data[media_data.findIndex((obj) => obj.id == toEdit.id)] = toEdit;
		toEdit.release = toEditRelease.toISOString();
		toEdit.added = toEditAdded.toISOString();
		const syncTimestamp = new Date();
		// DexieDB
		switch (current_medium) {
			case 'games':
				await dexieDB.games.update(toEdit.id, {
					title:
						toEdit.title && toEdit.title.trim().length > 0
							? toEdit.title.trim()
							: 'Kein Titel angegeben',
					image: toEdit.image && toEdit.image.trim().length > 0 ? toEdit.image.trim() : null,
					release:
						toEdit.release && toEdit.release.trim().length > 0 ? toEdit.release.trim() : null,
					genres: toEdit.genres && toEdit.genres.trim().length > 0 ? toEdit.genres.trim() : null,
					platforms:
						toEdit.platforms && toEdit.platforms.trim().length > 0 ? toEdit.platforms.trim() : null,
					added:
						toEdit.added && toEdit.added.trim().length > 0
							? toEdit.added.trim()
							: new Date().toISOString(),
					notes: toEdit.notes && toEdit.notes.trim().length > 0 ? toEdit.notes.trim() : null
				} as mediaObject);
				break;
			case 'movies':
				await dexieDB.movies.update(toEdit.id, {
					title:
						toEdit.title && toEdit.title.trim().length > 0
							? toEdit.title.trim()
							: 'Kein Titel angegeben',
					image: toEdit.image && toEdit.image.trim().length > 0 ? toEdit.image.trim() : null,
					release:
						toEdit.release && toEdit.release.trim().length > 0 ? toEdit.release.trim() : null,
					genres: toEdit.genres && toEdit.genres.trim().length > 0 ? toEdit.genres.trim() : null,
					added:
						toEdit.added && toEdit.added.trim().length > 0
							? toEdit.added.trim()
							: new Date().toISOString(),
					notes: toEdit.notes && toEdit.notes.trim().length > 0 ? toEdit.notes.trim() : null
				} as mediaObject);
				break;
			case 'shows':
				await dexieDB.shows.update(toEdit.id, {
					title:
						toEdit.title && toEdit.title.trim().length > 0 ? toEdit.title : 'Kein Titel angegeben',
					image: toEdit.image && toEdit.image.trim().length > 0 ? toEdit.image : null,
					release: toEdit.release && toEdit.release.trim().length > 0 ? toEdit.release : null,
					genres: toEdit.genres && toEdit.genres.trim().length > 0 ? toEdit.genres : null,
					added:
						toEdit.added && toEdit.added.trim().length > 0
							? toEdit.added
							: new Date().toISOString(),
					notes: toEdit.notes && toEdit.notes.trim().length > 0 ? toEdit.notes : null,
					seasons: toEdit.seasons && toEdit.seasons.trim().length > 0 ? toEdit.seasons : null,
					episode:
						toEdit.episode && toEdit.episode.toString().trim().length > 0 ? toEdit.episode : 0
				} as mediaObject);
				break;
			case 'books':
				await dexieDB.books.update(toEdit.id, {
					title:
						toEdit.title && toEdit.title.trim().length > 0 ? toEdit.title : 'Kein Titel angegeben',
					author: toEdit.author && toEdit.author.trim().length > 0 ? toEdit.author : null,
					image: toEdit.image && toEdit.image.trim().length > 0 ? toEdit.image : null,
					release: toEdit.release && toEdit.release.trim().length > 0 ? toEdit.release : null,
					genres: toEdit.genres && toEdit.genres.trim().length > 0 ? toEdit.genres : null,
					pagecount:
						toEdit.pagecount && toEdit.pagecount.toString().trim().length > 0
							? toEdit.pagecount
							: null,
					added:
						toEdit.added && toEdit.added.trim().length > 0
							? toEdit.added
							: new Date().toISOString(),
					notes: toEdit.notes && toEdit.notes.trim().length > 0 ? toEdit.notes : null
				} as mediaObject);
				break;
			default:
				break;
		}
		await dexieDB.prefs.update(0, { updated_at: syncTimestamp.toISOString() });
		// Supabase
		try {
			const dexiePrefs = (await dexieDB.prefs.toArray()).at(0);
			if (JSON.parse(dexiePrefs?.changed_offline || '').length != 0) {
				redoDexieChanges();
			}
			const res = await fetch('/api/v1/updateMedium', {
				method: 'POST',
				body: JSON.stringify({ toEdit, current_medium, syncTimestamp }),
				headers: {
					'Content-Type': 'application/json'
				}
			});
		} catch (error) {
			console.log(error);
			let dexiePrefs = (await dexieDB.prefs.toArray()).at(0);
			if (dexiePrefs) {
				if (!navigator.onLine) {
					const tmp: OfflineChangeObject[] = JSON.parse(dexiePrefs.changed_offline);
					tmp.push({ event: 'update', medium: current_medium, card: toEdit });
					dexiePrefs.changed_offline = JSON.stringify(tmp);
				}
				dexiePrefs.updated_at = syncTimestamp.toISOString();
				await dexieDB.prefs.update(0, dexiePrefs);
			}
		}
		const collapseInput = document.getElementById(
			String(toEdit.id) + `_${current_medium.charAt(0)}`
		);
		if (collapseInput != null && collapseInput instanceof HTMLInputElement) {
			collapseInput.checked = !collapseInput.checked;
		}
		dispatch('refresh');
		edit_modal.checked = false;
	}
</script>

<div class="bg-base-300 overflow-x-hidden overflow-y-auto flex-grow pt-2 scrollbar-hide">
	{#if current_mode != 2}
		{#each media_data as medium}
			{@const config = getRatingConfig(medium.rating || 0)}
			{#if current_medium === 'games'}
				<GameCard
					on:delete={askDelete}
					on:edit={showEditForm}
					on:updateScore={updateScore}
					{own_profile}
					{medium}
					{config}
					{current_mode}
				></GameCard>
			{:else if current_medium === 'movies'}
				<MovieCard
					on:delete={askDelete}
					on:edit={showEditForm}
					on:updateScore={updateScore}
					{own_profile}
					{medium}
					{config}
					{current_mode}
				></MovieCard>
			{:else if current_medium === 'shows'}
				<TvCard
					on:delete={askDelete}
					on:edit={showEditForm}
					on:updateScore={updateScore}
					{own_profile}
					{medium}
					{config}
					{current_mode}
				></TvCard>
			{:else if current_medium === 'books'}
				<BookCard
					on:delete={askDelete}
					on:edit={showEditForm}
					on:updateScore={updateScore}
					{own_profile}
					{medium}
					{config}
					{current_mode}
				></BookCard>
			{/if}
		{/each}
		<div class="h-[12.25%]"></div>
		<!-- Stats -->
	{:else}
		{#key media_data}
			{#if media_data.length != 0}
				{#if current_medium === 'games'}
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
		<div class="h-[5.5%]"></div>
	{/if}
</div>
<!-- DeleteModal -->
<input type="checkbox" id="deleteModal" class="modal-toggle" bind:this={deleteModal} />
<div class="modal" role="dialog">
	<div class="modal-box flex flex-col">
		<p class="font-semibold text-lg mb-3">{toDelete.title} wirklich löschen?</p>
		<button
			class="btn btn-error font-bold"
			on:click={() => {
				dispatch('delete', toDelete);
				deleteModal.checked = false;
			}}>Löschen</button
		>
	</div>
	<label
		use:tap
		on:tap={() => {
			deleteModal.checked = false;
		}}
		class="modal-backdrop"
		for="deleteModal">Close</label
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
			<input type="text" bind:value={toEdit.title} class="input input-bordered w-full max-w-xs" />
		</label>
		<!-- Image -->
		<label class="form-control w-full max-w-xs">
			<div class="label">
				<span class="label-text">Bild-URL</span>
			</div>
			<input type="text" bind:value={toEdit.image} class="input input-bordered w-full max-w-xs" />
		</label>
		<!-- Release  -->
		<div class="label">
			<span class="label-text">Release-Datum</span>
		</div>
		<DateInput bind:value={toEditRelease} />
		<!-- Genres -->
		<label class="form-control w-full max-w-xs">
			<div class="label">
				<span class="label-text">Genre-Liste</span>
			</div>
			<input type="text" bind:value={toEdit.genres} class="input input-bordered w-full max-w-xs" />
		</label>
		<!-- Added -->
		<div class="label">
			<span class="label-text">Hinzugefügt</span>
		</div>
		<DateInput bind:value={toEditAdded} />
		<!-- Notes -->
		<label class="form-control">
			<div class="label">
				<span class="label-text">Notizen</span>
			</div>
			<textarea class="textarea textarea-bordered h-24" bind:value={toEdit.notes}></textarea>
		</label>
		{#if current_medium === 'games'}
			<!-- Platforms	 -->
			<label class="form-control w-full max-w-xs">
				<div class="label">
					<span class="label-text">Plattform-Liste</span>
				</div>
				<input
					type="text"
					bind:value={toEdit.platforms}
					class="input input-bordered w-full max-w-xs"
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
					bind:value={toEdit.seasons}
					class="input input-bordered w-full max-w-xs"
				/>
			</label>
			<!-- Episoden	 -->
			<label class="form-control w-full max-w-xs">
				<div class="label">
					<span class="label-text">Episode</span>
				</div>
				<input
					type="text"
					bind:value={toEdit.episode}
					class="input input-bordered w-full max-w-xs"
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
					bind:value={toEdit.author}
					class="input input-bordered w-full max-w-xs"
				/>
			</label>
			<!-- pagecount	 -->
			<label class="form-control w-full max-w-xs">
				<div class="label">
					<span class="label-text">Seitenzahl</span>
				</div>
				<input
					type="text"
					bind:value={toEdit.pagecount}
					class="input input-bordered w-full max-w-xs"
				/>
			</label>
		{/if}
		<button class="btn btn-success font-bold mt-3" on:click={updateMedium}
			>Änderungen speichern</button
		>
	</div>
	<label
		use:tap
		on:tap={() => {
			edit_modal.checked = false;
		}}
		class="modal-backdrop -z-10"
		for="edit_modal">Close</label
	>
</div>
