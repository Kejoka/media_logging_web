<script lang="ts">
	import {
		dexieDB,
		redoDexieChanges,
		type mediaObject,
		type OfflineChangeObject
	} from '$lib/dbUtils';
	import { createEventDispatcher } from 'svelte';
	import StarRating from '$lib/UI/Stars_modified/Stars.svelte';
	import { press, tap } from 'svelte-gestures';
	const dispatch = createEventDispatcher();
	export let medium: mediaObject;
	export let config;
	export let current_mode: number;
	export let own_profile: boolean;
	let unique = {};

	function restart() {
		unique = {};
	}

	async function handleImageInteraction(event: CustomEvent, medium: mediaObject) {
		if (medium.episode != undefined && event.type == 'tap') {
			medium.episode += 1;
		} else if (medium.episode != undefined && event.type == 'press') {
			medium.episode = Math.max(medium.episode - 1, 0);
		}
		const sync_timestamp = new Date();
		// DexieDB
		await dexieDB.shows.update(medium.id, { episode: medium.episode });
		await dexieDB.prefs.update(0, { updated_at: sync_timestamp.toISOString() });
		restart();
		// Supabase
		try {
			const dexie_prefs = (await dexieDB.prefs.toArray()).at(0);
			if (JSON.parse(dexie_prefs?.changed_offline || '').length != 0) {
				redoDexieChanges();
			}
			const res = await fetch('/api/v1/updateEpisode', {
				method: 'POST',
				body: JSON.stringify({
					new_value: medium.episode,
					id: medium.id,
					sync_timestamp
				})
			});
			console.log(await res.json());
		} catch (error) {
			console.log(error);
			let dexie_prefs = (await dexieDB.prefs.toArray()).at(0);
			if (dexie_prefs) {
				if (!navigator.onLine) {
					const tmp: OfflineChangeObject[] = JSON.parse(dexie_prefs.changed_offline);
					tmp.push({
						event: 'episode',
						medium: 'shows',
						card: { id: medium.id, episode: medium.episode }
					});
					dexie_prefs.changed_offline = JSON.stringify(tmp);
				}
				dexie_prefs.updated_at = sync_timestamp.toISOString();
				await dexieDB.prefs.update(0, dexie_prefs);
			}
		}
	}
</script>

{#key unique}
	<div class="px-2 pb-2">
		<div class="{own_profile || medium.notes ? 'collapse' : ''} bg-base-100">
			<input id={String(medium.id) + '_s'} type="radio" name="movie-accordion" class="hidden" />
			<!-- Card here -->
			<div class="card card-side h-[15vh] max-h-[15vh] min-h-[15vh] select-none bg-base-100">
				<figure
					class="w-[11.25vh] min-w-[11.25vh] max-w-[11.25vh]"
					use:tap
					on:tap={(e) => handleImageInteraction(e, medium)}
					use:press={{ timeframe: 150, triggerBeforeFinished: true }}
					on:press={(e) => handleImageInteraction(e, medium)}
				>
					<div class="relative">
						{#if medium.image != null}
							<img src={medium.image} alt={medium.title} />
						{:else}
							<img src={'/placeholder.png'} alt={'Kein Bild'} />
						{/if}
						{#if medium.episode != 0}
							<div
								class="text-md badge badge-outline absolute bottom-0 right-0 aspect-square bg-neutral bg-opacity-80 px-1 font-light"
							>
								{medium.episode}
							</div>
						{/if}
					</div>
				</figure>
				<div
					class="card-body justify-center pl-2"
					use:tap
					on:tap={() => {
						const collapse_input = document.getElementById(String(medium.id) + '_s');
						if (collapse_input != null && collapse_input instanceof HTMLInputElement) {
							collapse_input.checked = !collapse_input.checked;
						}
					}}
				>
					<div class="w-[115%]">
						<p class="card-title line-clamp-1 text-base font-bold">{medium.title}</p>
						{#if medium.genres}
							<p class="line-clamp-1 text-sm font-light">{medium.genres}</p>
						{/if}
						{#if medium.seasons}
							<p class="line-clamp-1 text-sm font-light">Staffel: {medium.seasons}</p>
						{/if}
						{#if medium.release}
							<p class="line-clamp-1 text-sm font-light">
								Erschienen: {new Date(medium.release || 404).toLocaleDateString('de-DE')}
							</p>
						{/if}
						{#if medium.averagerating && !isNaN(medium.averagerating)}
							<p class="line-clamp-1 text-sm font-light">
								Nutzerbewertung: {medium.averagerating}
							</p>
						{/if}
					</div>
				</div>
				{#if current_mode == 0}
					<div class="my-auto h-fit px-2">
						<StarRating
							{config}
							on:change={() => dispatch('update_score', { new_score: config.score, medium })}
						></StarRating>
					</div>
				{/if}
			</div>
			<div class="collapse-content px-2 pt-0">
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
				{#if own_profile}
					<button
						class="btn btn-warning my-2 h-8 min-h-8 w-full font-bold"
						on:click={() => dispatch('edit', medium)}>Karte bearbeiten</button
					>
					<button
						class="btn btn-error -mb-4 h-8 min-h-8 w-full font-bold"
						on:click={() => dispatch('delete', medium)}>Karte löschen</button
					>
				{/if}
				<button
					class="btn btn-info -mb-4 mt-3 h-8 min-h-8 w-full font-bold"
					on:click={() => dispatch('showStreams', medium)}
				>
					Wo streamen?
				</button>
			</div>
		</div>
	</div>
{/key}
