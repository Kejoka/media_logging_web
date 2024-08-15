<script lang="ts">
	import type { mediaObject } from '$lib/dbUtils';
	import { createEventDispatcher } from 'svelte';
	import StarRating from '$lib/UI/Stars_modified/Stars.svelte';
	import { tap } from 'svelte-gestures';
	const dispatch = createEventDispatcher();
	export let medium: mediaObject;
	export let config;

	console.log(medium);
</script>

<div class="px-2 pb-2">
	<div class="collapse bg-base-100">
		<input id={String(medium.id)} type="radio" name="movie-accordion" class="hidden" />
		<!-- Card here -->
		<div class="card bg-base-100 card-side h-[30vw] select-none" use:tap>
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
					if (collapseInput != null) {
						collapseInput.checked = !collapseInput.checked;
					}
				}}
			>
				<div>
					<p class="card-title text-base font-bold line-clamp-1">{medium.title}</p>
					<p class="text-sm line-clamp-1 font-light">Autor: {medium.author}</p>
					{#if medium.genres != null}
						<p class="text-sm line-clamp-1 font-light">{medium.genres}</p>
					{/if}
					<p class="text-sm line-clamp-1 font-light">
						Erschienen: {new Date(medium.release || 404).toLocaleDateString('de-DE')}
					</p>
					{#if medium.pagecount != undefined && medium.pagecount > 0}
						<p class="text-sm line-clamp-1 font-light">Seitenzahl: {medium.pagecount}</p>
					{/if}
				</div>
			</div>
			<div class="px-2 h-fit my-auto">
				<StarRating
					{config}
					on:change={() => dispatch('updateScore', { new_score: config.score, medium })}
				></StarRating>
			</div>
		</div>
		<div class="collapse-content flex flex-row justify-center pt-0 px-2">
			<div class="w-full mt-3">
				<button
					class="btn min-h-[100%] h-[100%] btn-error font-bold w-full"
					on:click={() => dispatch('delete', medium)}>Karte löschen</button
				>
			</div>
		</div>
	</div>
</div>
