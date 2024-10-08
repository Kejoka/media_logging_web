<script lang="ts">
	import {
		dexieDB,
		redoDexieChanges,
		type mediaObject,
		type OfflineChangeObject
	} from '$lib/dbUtils';
	import { createEventDispatcher } from 'svelte';
	import StarRating from '$lib/UI/Stars_modified/Stars.svelte';
	import { tap } from 'svelte-gestures';
	import Trophy from '$lib/Icons/trophy.svelte';
	const dispatch = createEventDispatcher();
	export let medium: mediaObject;
	export let config;
	export let current_mode: number;
	export let own_profile: boolean;
	let unique = {};

	function restart() {
		unique = {};
	}

	async function handleImageTap(medium: mediaObject) {
		medium.trophy = 1 - (medium.trophy || 0);
		const sync_timestamp = new Date();
		// DexieDB
		await dexieDB.games.update(medium.id, { trophy: medium.trophy });
		await dexieDB.prefs.update(0, { updated_at: sync_timestamp.toISOString() });
		restart();
		// Supabase
		try {
			const dexie_prefs = (await dexieDB.prefs.toArray()).at(0);
			if (JSON.parse(dexie_prefs?.changed_offline || '').length != 0) {
				redoDexieChanges();
			}
			const res = await fetch('/api/v1/updateTrophy', {
				method: 'POST',
				body: JSON.stringify({
					new_value: medium.trophy,
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
						event: 'trophy',
						medium: 'games',
						card: { id: medium.id, trophy: medium.trophy } as mediaObject
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
			<input id={String(medium.id) + '_g'} type="radio" name="movie-accordion" class="hidden" />
			<!-- Card here -->
			<div class="card bg-base-100 card-side select-none min-h-[15vh] h-[15vh] max-h-[15vh]">
				<figure
					class="min-w-[11.25vh] w-[11.25vh] max-w-[11.25vh]"
					use:tap
					on:tap={() => handleImageTap(medium)}
				>
					<div class="relative">
						{#if medium.image != null}
							<img src={medium.image} alt={medium.title} />
						{:else}
							<img src={'/placeholder.png'} alt={'Kein Bild'} />
						{/if}
						{#if medium.trophy != 0}
							<div
								class="badge badge-outline bg-opacity-80 bg-neutral absolute bottom-0 right-0 py-3 px-1"
							>
								<Trophy styling={'w-4 h-4'}></Trophy>
							</div>
						{/if}
					</div>
				</figure>
				<div
					class="card-body justify-center pl-2"
					use:tap
					on:tap={() => {
						const collapse_input = document.getElementById(String(medium.id) + '_g');
						if (collapse_input != null && collapse_input instanceof HTMLInputElement) {
							collapse_input.checked = !collapse_input.checked;
						}
					}}
				>
					<div class="w-[115%]">
						<p class="card-title text-base font-bold line-clamp-1">{medium.title}</p>
						{#if medium.genres}
							<p class="text-sm line-clamp-1 font-light max-w-fit">{medium.genres}</p>
						{/if}
						{#if medium.platforms}
							<p class="text-sm line-clamp-1 font-light max-w-fit">{medium.platforms}</p>
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
							on:change={() => dispatch('update_score', { new_score: config.score, medium })}
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
				{#if own_profile}
					<button
						class="btn btn-warning font-bold w-full my-2 min-h-8 h-8"
						on:click={() => dispatch('edit', medium)}>Karte bearbeiten</button
					>
					<button
						class="btn btn-error font-bold w-full min-h-8 h-8 -mb-4"
						on:click={() => dispatch('delete', medium)}>Karte löschen</button
					>
				{/if}
			</div>
		</div>
	</div>
{/key}
