<script lang="ts">
	import TvCard from './tvCard.svelte';
	import { dexieDB, type mediaObject } from '$lib/dbUtils';
	import { createEventDispatcher } from 'svelte';
	import GameCard from './gameCard.svelte';
	import MovieCard from './movieCard.svelte';
	import BookCard from './bookCard.svelte';
	import { DateInput } from 'date-picker-svelte';
	export let media_data: mediaObject[];
	export let current_medium: string;
	export let current_mode: number;
	let deleteModal: HTMLInputElement;
	let editModal: HTMLInputElement;
	let toDelete: mediaObject = { title: '' };
	let toEdit: mediaObject = { title: '' };
	let toEditRelease: Date = new Date();
	let toEditAdded: Date = new Date();
	const dispatch = createEventDispatcher();

	function getRatingConfig(score: number) {
		return {
			readOnly: false,
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
				fillColor: '#00FFDC',
				strokeColor: '#BB8511',
				unfilledColor: '#143F39',
				strokeUnfilledColor: '#000'
			}
		};
	}

	async function updateScore(event: CustomEvent) {
		try {
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
			// Supabase
			const res = await fetch('/api/v1/updateScore', {
				method: 'POST',
				body: JSON.stringify({
					score: event.detail.new_score,
					medium: event.detail.medium,
					current_medium
				}),
				headers: {
					'Content-Type': 'application/json'
				}
			});
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
		editModal.checked = true;
	}

	async function updateMedium() {
		toEdit.release = toEditRelease.toISOString();
		toEdit.added = toEditAdded.toISOString();
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
				});
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
				});
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
				});
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
				});
				break;
			default:
				break;
		}
		// Supabase
		const error = await fetch('/api/v1/updateMedium', {
			method: 'POST',
			body: JSON.stringify({ toEdit, current_medium }),
			headers: {
				'Content-Type': 'application/json'
			}
		});
		const collapseInput = document.getElementById(String(toEdit.id));
		if (collapseInput != null && collapseInput instanceof HTMLInputElement) {
			collapseInput.checked = !collapseInput.checked;
		}
		dispatch('refresh');
		editModal.checked = false;
	}
</script>

<div class="bg-base-300 overflow-x-hidden overflow-y-auto flex-grow mb-[10%] pt-2">
	{#each media_data as medium}
		{@const config = getRatingConfig(medium.rating || 0)}
		{#if current_medium === 'games'}
			<GameCard
				on:delete={askDelete}
				on:edit={showEditForm}
				on:updateScore={updateScore}
				{medium}
				{config}
				{current_mode}
			></GameCard>
		{:else if current_medium === 'movies'}
			<MovieCard
				on:delete={askDelete}
				on:edit={showEditForm}
				on:updateScore={updateScore}
				{medium}
				{config}
				{current_mode}
			></MovieCard>
		{:else if current_medium === 'shows'}
			<TvCard
				on:delete={askDelete}
				on:edit={showEditForm}
				on:updateScore={updateScore}
				{medium}
				{config}
				{current_mode}
			></TvCard>
		{:else if current_medium === 'books'}
			<BookCard
				on:delete={askDelete}
				on:edit={showEditForm}
				on:updateScore={updateScore}
				{medium}
				{config}
				{current_mode}
			></BookCard>
		{/if}
	{/each}
	<div class="h-[9.5%]"></div>
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
		<label class="modal-backdrop" for="deleteModal">Close</label>
	</div>
	<!-- EditModal -->
	<input type="checkbox" id="editModal" class="modal-toggle" bind:this={editModal} />
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
				<input
					type="text"
					bind:value={toEdit.genres}
					class="input input-bordered w-full max-w-xs"
				/>
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
		<label class="modal-backdrop" for="editModal">Close</label>
	</div>
</div>
