<script lang="ts">
	import type { mediaObject } from '$lib/dbUtils';
	import { createEventDispatcher } from 'svelte';
	import StarRating from '$lib/UI/Stars_modified/Stars.svelte';
	import { press, tap } from 'svelte-gestures';
	import Trophy from '$lib/Icons/trophy.svelte';
	const dispatch = createEventDispatcher();
	export let medium: mediaObject;
	export let config;
	let unique = {};

	function restart() {
		unique = {};
	}

	async function handleImageTap(medium: mediaObject) {
		medium.trophy = 1 - (medium.trophy || 0);
		const res = await fetch('/api/v1/updateTrophy', {
			method: 'POST',
			body: JSON.stringify({
				new_value: medium.trophy,
				id: medium.id
			})
		});
		console.log(await res.json());
		restart();
	}
</script>

{#key unique}
	<div class="px-2 pb-2">
		<div class="collapse bg-base-100">
			<input id={String(medium.id)} type="radio" name="movie-accordion" class="hidden" />
			<!-- Card here -->
			<div class="card bg-base-100 card-side h-[30vw] select-none">
				<figure
					class="min-w-[23%] w-[23%] max-w-[23%]"
					use:tap
					on:tap={() => handleImageTap(medium)}
				>
					{#if medium.image != null}
						<img src={medium.image} alt={medium.title} />
					{:else}
						<img src={'/placeholder.png'} alt={'Kein Bild'} />
					{/if}
					{#if medium.trophy != 0}
						<div
							class="badge badge-outline bg-opacity-80 bg-neutral absolute bottom-0 left-[16%] h-[23%] px-1"
						>
							<Trophy styling={'w-4 h-4'}></Trophy>
						</div>
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
						<p class="text-sm line-clamp-1 font-light">{medium.genres}</p>
						<p class="text-sm line-clamp-1 font-light">{medium.platforms}</p>
						<p class="text-sm line-clamp-1 font-light">
							Erschienen: {new Date(medium.release || 404).toLocaleDateString('de-DE')}
						</p>
						<p class="text-sm line-clamp-1 font-light">
							Nutzerbewertung: {medium.averagerating}
						</p>
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
{/key}
