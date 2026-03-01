<script lang="ts">
	import type { mediaObject } from '$lib/dbUtils';
	import { createEventDispatcher } from 'svelte';
	import StarRating from '$lib/UI/Stars_modified/Stars.svelte';
	const dispatch = createEventDispatcher();
	export let medium: mediaObject;
	export let config;
	export let current_mode: number;
	export let own_profile: boolean;

	let unique = {};

	// Funktion um HTTP-URLs zu HTTPS zu konvertieren
	function ensureHttps(url: string | null): string | null {
		if (!url) return null;
		return url.replace(/^http:\/\//, 'https://');
	}
</script>

{#key unique}
	<div class="px-2 pb-2">
		<div class="collapse bg-base-100">
			<input id={String(medium.id) + '_b'} type="radio" name="movie-accordion" class="hidden" />
			<!-- Card here -->
			<div class="card card-side h-[15vh] max-h-[15vh] min-h-[15vh] bg-base-100 select-none">
				<figure class="w-[11.25vh] max-w-[11.25vh] min-w-[11.25vh]">
					{#if medium.image != null}
					<img src={ensureHttps(medium.image)} alt={medium.title} />
					{:else}
						<img src={'/placeholder.png'} alt={'Kein Bild'} />
					{/if}
				</figure>
				<div
					class="card-body justify-center pl-2"
					role="button"
					tabindex="0"
					on:click={() => {
						const collapse_input = document.getElementById(String(medium.id) + '_b');
						if (collapse_input != null && collapse_input instanceof HTMLInputElement) {
							collapse_input.checked = !collapse_input.checked;
						}
					}}
					on:keydown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							const collapse_input = document.getElementById(String(medium.id) + '_b');
							if (collapse_input != null && collapse_input instanceof HTMLInputElement) {
								collapse_input.checked = !collapse_input.checked;
							}
						}
					}}
				>
					<div class="w-[107%]">
						<p class="card-title line-clamp-1 text-base font-bold">{medium.title}</p>
						{#if medium.author}
							<p class="line-clamp-1 text-sm font-light">Autor: {medium.author}</p>
						{/if}
						{#if medium.genres}
							<p class="line-clamp-1 text-sm font-light">{medium.genres}</p>
						{/if}
						{#if medium.release}
							<p class="line-clamp-1 text-sm font-light">
								Erschienen: {new Date(medium.release || 404).toLocaleDateString('de-DE')}
							</p>
						{/if}
						{#if medium.pagecount != undefined && medium.pagecount > 0}
							<p class="line-clamp-1 text-sm font-light">Seitenzahl: {medium.pagecount}</p>
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
					<div class="chat-header mt-3">Review:</div>
					{#each medium.notes.split('\n') as review}
						<div class="chat-start chat">
							<div class="chat-bubble w-fit">
								{review}
							</div>
						</div>
					{/each}
				{:else if !own_profile}
					<div class="chat-start mt-3 chat">
						<div class="chat-bubble w-fit">Keine Review vorhanden.</div>
					</div>
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
