<script lang="ts">
	import { tap } from 'svelte-gestures';
	import TvCard from './tvCard.svelte';
	import type { mediaObject } from '$lib/dbUtils';
	import { createEventDispatcher } from 'svelte';
	import GameCard from './gameCard.svelte';
	import MovieCard from './movieCard.svelte';
	import BookCard from './bookCard.svelte';
	export let media_data: mediaObject[];
	export let current_medium: string;
	let delete_modal: HTMLInputElement;
	let toDelete: mediaObject = { title: '' };
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
			console.log(await res.json());
		} catch (error) {
			console.log(error);
		}
	}

	function askDelete(event: CustomEvent) {
		toDelete = event.detail;
		delete_modal.checked = true;
	}
</script>

<div class="bg-base-300 overflow-x-hidden overflow-y-auto flex-grow mb-[10%] pt-2">
	{#each media_data as medium}
		{@const config = getRatingConfig(medium.rating || 0)}
		{#if current_medium === 'games'}
			<GameCard on:delete={askDelete} on:updateScore={updateScore} {medium} {config}></GameCard>
		{:else if current_medium === 'movies'}
			<MovieCard on:delete={askDelete} on:updateScore={updateScore} {medium} {config}></MovieCard>
		{:else if current_medium === 'shows'}
			<TvCard on:delete={askDelete} on:updateScore={updateScore} {medium} {config}></TvCard>
		{:else if current_medium === 'books'}
			<BookCard on:delete={askDelete} on:updateScore={updateScore} {medium} {config}></BookCard>
		{/if}
	{/each}
	<div class="h-[6%]"></div>
	<input type="checkbox" id="delete_modal" class="modal-toggle" bind:this={delete_modal} />
	<div class="modal" role="dialog">
		<div class="modal-box flex flex-col">
			<p class="font-semibold text-lg mb-3">{toDelete.title} wirklich löschen?</p>
			<button
				class="btn btn-error font-bold"
				on:click={() => {
					dispatch('delete', toDelete);
					delete_modal.checked = false;
				}}>Löschen</button
			>
		</div>
		<label class="modal-backdrop" for="delete_modal">Close</label>
	</div>
</div>
