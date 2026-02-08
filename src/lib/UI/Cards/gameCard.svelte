<script lang="ts">
	import {
		dexieDB,
		redoDexieChanges,
		type mediaObject,
		type OfflineChangeObject
	} from '$lib/dbUtils';
	import { createEventDispatcher } from 'svelte';
	import StarRating from '$lib/UI/Stars_modified/Stars.svelte';
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
			<div class="card card-side h-[15vh] max-h-[15vh] min-h-[15vh] bg-base-100 select-none">
				<button
					type="button"
					class="w-[11.25vh] max-w-[11.25vh] min-w-[11.25vh] border-0 bg-transparent p-0"
					on:click={() => handleImageTap(medium)}
					on:keydown={(e) => (e.key === 'Enter' || e.key === ' ' ? handleImageTap(medium) : null)}
				>
					<figure class="h-full w-full">
						<div class="relative h-full overflow-hidden">
							{#if medium.image != null}
								<img
									src={medium.image}
									alt={medium.title}
									class="h-full w-full object-cover object-center"
								/>
							{:else}
								<img
									src={'/placeholder.png'}
									alt={'Kein Bild'}
									class="h-full w-full object-cover object-center"
								/>
							{/if}
							{#if medium.trophy != 0}
								<div
									class="bg-opacity-80 absolute right-0 bottom-0 badge h-10 w-10 rounded-tl-2xl badge-outline bg-neutral"
								>
									<Trophy styling={'w-full'}></Trophy>
								</div>
							{/if}
						</div>
					</figure>
				</button>
				<div
					class="card-body justify-center pl-2"
					role="button"
					tabindex="0"
					on:click={() => {
						const collapse_input = document.getElementById(String(medium.id) + '_g');
						if (collapse_input != null && collapse_input instanceof HTMLInputElement) {
							collapse_input.checked = !collapse_input.checked;
						}
					}}
					on:keydown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') {
							const collapse_input = document.getElementById(String(medium.id) + '_g');
							if (collapse_input != null && collapse_input instanceof HTMLInputElement) {
								collapse_input.checked = !collapse_input.checked;
							}
						}
					}}
				>
					<div class="w-[107%]">
						<p class="card-title line-clamp-1 text-base font-bold">{medium.title}</p>
						{#if medium.genres}
							<p class="line-clamp-1 max-w-fit text-sm font-light">{medium.genres}</p>
						{/if}
						{#if medium.platforms}
							<p class="line-clamp-1 max-w-fit text-sm font-light">{medium.platforms}</p>
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
						<div class="chat-start chat">
							<div class="chat-bubble w-fit">
								{note}
							</div>
						</div>
					{/each}
				{/if}
				{#if own_profile}
					<button
						class="btn my-3 h-8 min-h-8 w-full rounded-lg font-bold btn-warning"
						on:click={() => dispatch('edit', medium)}>Karte bearbeiten</button
					>
					<button
						class="btn h-8 min-h-8 w-full rounded-lg font-bold btn-error"
						on:click={() => dispatch('delete', medium)}>Karte löschen</button
					>
				{/if}
			</div>
		</div>
	</div>
{/key}
