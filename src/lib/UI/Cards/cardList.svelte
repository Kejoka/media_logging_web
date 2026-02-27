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
	export let media_data: mediaObject[];
	export let current_medium: string;
	export let current_mode: number;
	export let own_profile: boolean;
	let delete_modal: HTMLInputElement;
	let streaming_modal: HTMLInputElement;
	let edit_modal: HTMLInputElement;
	let to_delete: mediaObject = { title: '' };
	let to_edit: mediaObject = { title: '' };
	let to_editRelease: Date = new Date();
	let to_editAdded: Date = new Date();
	let streaming_data: { ads?: Object[]; buy?: Object[]; flatrate?: Object[]; rent?: Object[] } = {};
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
		to_editRelease = new Date(to_edit.release || '');
		to_editAdded = new Date(to_edit.added || '');
		edit_modal.checked = true;
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
			streaming_data = (await res.json()).results.DE;
			streaming_modal.checked = true;
		} catch (error) {
			console.log(error);
		}
	}

	async function updateMedium() {
		media_data[media_data.findIndex((obj) => obj.id == to_edit.id)] = to_edit;
		to_edit.release = to_editRelease.toISOString();
		to_edit.added = to_editAdded.toISOString();
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
		{#each media_data as medium}
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
		<!-- Notes -->
		<label class="form-control">
			<div class="label">
				<span class="label-text">Notizen</span>
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
