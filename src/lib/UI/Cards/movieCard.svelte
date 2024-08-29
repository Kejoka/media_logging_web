<script lang="ts">
	import type { mediaObject } from '$lib/dbUtils';
	import { createEventDispatcher } from 'svelte';
	import StarRating from '$lib/UI/Stars_modified/Stars.svelte';
	import { tap } from 'svelte-gestures';
	const dispatch = createEventDispatcher();
	export let medium: mediaObject;
	export let config;
	export let current_mode;
</script>

<div class="px-2 pb-2">
	<div class="collapse bg-base-100">
		<input id={String(medium.id)} type="radio" name="movie-accordion" class="hidden" />
		<div class="card bg-base-100 card-side h-[30vw] select-none">
			<figure class="min-w-[23%] w-[23%] max-w-[23%]">
				{#if medium.image != null}
					<img src={medium.image} alt={medium.title} />
				{:else}
					<img src={'/placeholder.png'} alt={'Kein Bild'} />
				{/if}
			</figure>
			<div
				class="card-body justify-center pl-2"
				use:tap
				on:tap={() => {
					const collapseInput = document.getElementById(String(medium.id));
					if (collapseInput != null && collapseInput instanceof HTMLInputElement) {
						collapseInput.checked = !collapseInput.checked;
					}
				}}
			>
				<div class="w-[115%]">
					<p class="card-title text-base font-bold line-clamp-1">{medium.title}</p>
					{#if medium.genres}
						<p class="text-sm line-clamp-1 font-light">{medium.genres}</p>
					{/if}
					{#if medium.release}
						<p class="text-sm line-clamp-1 font-light">
							Erschienen: {new Date(medium.release || 404).toLocaleDateString('de-DE')}
						</p>
					{/if}
					{#if medium.averagerating && !isNaN(medium.averagerating)}
						<p class="text-sm line-clamp-1 font-light">
							Nutzerbewertung: {medium.averagerating}
						</p>
					{/if}
				</div>
			</div>
			{#if current_mode == 0}
				<div class="px-2 h-fit my-auto">
					<StarRating
						{config}
						on:change={() => dispatch('updateScore', { new_score: config.score, medium })}
					></StarRating>
				</div>
			{/if}
		</div>
		<div class="collapse-content pt-0 px-2">
			{#if medium.notes}
				<div class="chat-header mt-3">Notiz:</div>
				{#each medium.notes.split('\n') as note}
					<div class="chat chat-start">
						<div class="chat-bubble w-fit">
							{note}
						</div>
					</div>
				{/each}
			{/if}
			<button
				class="btn btn-warning font-bold w-full my-2 min-h-8 h-8"
				on:click={() => dispatch('edit', medium)}>Karte bearbeiten</button
			>
			<button
				class="btn btn-error font-bold w-full min-h-8 h-8 -mb-4"
				on:click={() => dispatch('delete', medium)}>Karte löschen</button
			>
		</div>
	</div>
</div>
