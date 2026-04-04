<script lang="ts">
	import type { mediaObject } from '$lib/dbUtils';
	import { createEventDispatcher } from 'svelte';
	import StarRating from '$lib/UI/Stars_modified/Stars.svelte';
	import RatingPickerModal from '$lib/UI/Stars_modified/RatingPickerModal.svelte';
	import { decodeReviewNotes } from '$lib/reviewNotes';
	const dispatch = createEventDispatcher();
	export let medium: mediaObject;
	export let config: any;
	export let current_mode: number;
	export let own_profile: boolean;

	let unique = {};
	let ratingModalOpen = false;
	let modalScore = 0;
	let modalOpenVersion = 0;
	let pointerStart: { x: number; y: number } | null = null;
	let pointerStartScore = 0;
	let suppressInlineScoreUpdateUntil = 0;
	let revealedSpoilers: number[] = [];
	let lastNotesValue = '';
	const TAP_THRESHOLD = 8;

	$: decodedNotes = decodeReviewNotes(medium.notes);

	$: {
		const currentNotesValue = medium.notes || '';
		if (currentNotesValue !== lastNotesValue) {
			revealedSpoilers = [];
			lastNotesValue = currentNotesValue;
		}
	}

	function handleRatingPointerDown(event: PointerEvent) {
		if (!own_profile) {
			return;
		}
		pointerStartScore = resolveScore(config?.score);
		pointerStart = { x: event.clientX, y: event.clientY };
	}

	function resolveScore(rawScore: unknown): number {
		const parsed = Number(rawScore);
		if (Number.isFinite(parsed)) {
			return Math.max(0, Math.min(5, Math.round(parsed * 2) / 2));
		}
		const fallback = Number(medium.rating ?? 0);
		return Number.isFinite(fallback) ? Math.max(0, Math.min(5, Math.round(fallback * 2) / 2)) : 0;
	}

	function openRatingModal(scoreToOpenWith: unknown) {
		modalScore = resolveScore(scoreToOpenWith);
		modalOpenVersion += 1;
		ratingModalOpen = true;
	}

	function handleRatingPointerUp(event: PointerEvent) {
		if (!own_profile || !pointerStart) {
			return;
		}
		const movedDistance = Math.hypot(
			event.clientX - pointerStart.x,
			event.clientY - pointerStart.y
		);
		pointerStart = null;
		if (movedDistance <= TAP_THRESHOLD) {
			suppressInlineScoreUpdateUntil = Date.now() + 250;
			config.score = pointerStartScore;
			openRatingModal(pointerStartScore);
		}
	}

	function handleRatingPointerCancel() {
		pointerStart = null;
	}

	function handleModalScoreChange(event: CustomEvent<{ score: number }>) {
		dispatch('update_score', { new_score: event.detail.score, medium });
	}

	function handleModalNotesChange(event: CustomEvent<{ notes: string }>) {
		if ((medium.notes || '') === event.detail.notes) {
			return;
		}
		dispatch('update_notes', { medium, notes: event.detail.notes });
	}

	function handleInlineScoreChange() {
		if (Date.now() < suppressInlineScoreUpdateUntil) {
			config.score = medium.rating || 0;
			return;
		}
		dispatch('update_score', { new_score: config.score, medium });
	}

	function revealSpoiler(index: number) {
		if (!revealedSpoilers.includes(index)) {
			revealedSpoilers = [...revealedSpoilers, index];
		}
	}

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
						<button
							type="button"
							class="inline-flex"
							on:pointerdown={handleRatingPointerDown}
							on:pointerup={handleRatingPointerUp}
							on:pointercancel={handleRatingPointerCancel}
							on:click|stopPropagation
						>
							<StarRating {config} on:change={handleInlineScoreChange}></StarRating>
						</button>
					</div>
				{/if}
			</div>
			<div class="collapse-content px-2 pt-0">
				{#if decodedNotes.bubbles.length > 0}
					<div class="chat-header mt-3">Review-Notizen:</div>
					{#each decodedNotes.bubbles as bubble, index (index)}
						<div class="chat-start chat">
							{#if bubble.spoiler && !revealedSpoilers.includes(index)}
								<button
									type="button"
									class="chat-bubble w-fit max-w-full cursor-pointer text-left wrap-break-word transition"
									on:click={() => revealSpoiler(index)}
								>
									<span class="blur-sm">{bubble.text}</span>
								</button>
							{:else}
								<div class="chat-bubble w-fit max-w-full wrap-break-word transition">
									{bubble.text}
								</div>
							{/if}
						</div>
					{/each}
				{:else if !own_profile}
					<div class="chat-start mt-3 chat">
						<div class="chat-bubble w-fit">Keine Review-Notizen vorhanden.</div>
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

{#key modalOpenVersion}
	<RatingPickerModal
		open={ratingModalOpen}
		title={medium.title || ''}
		score={modalScore}
		notes={medium.notes || ''}
		on:close={() => {
			ratingModalOpen = false;
		}}
		on:scoreChange={handleModalScoreChange}
		on:notesChange={handleModalNotesChange}
	/>
{/key}
