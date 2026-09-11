<script lang="ts">
	import type { mediaObject } from '$lib/dbUtils';
	import { createEventDispatcher, onMount } from 'svelte';
	import StarRating from '$lib/UI/Stars_modified/Stars.svelte';
	import RatingPickerModal from '$lib/UI/Stars_modified/RatingPickerModal.svelte';
	import EditNoteIcon from '$lib/Icons/edit_note.svelte';
	import DeleteIcon from '$lib/Icons/delete.svelte';
	import GroupIcon from '$lib/Icons/group.svelte';
	import RateReviewIcon from '$lib/Icons/rate_review.svelte';
	import RepeatIcon from '$lib/Icons/repeat.svelte';
	import { decodeReviewNotes } from '$lib/reviewNotes';
	import { format_music_genres } from '$lib/utils';

	type RatingConfig = {
		readOnly: boolean;
		countStars: number;
		range: { min: number; max: number; step: number };
		score: number;
		showScore: boolean;
		name: string;
		scoreFormat: () => string;
		starConfig: {
			size: number;
			fillColor: string;
			strokeColor: string;
			unfilledColor: string;
			strokeUnfilledColor: string;
		};
		[key: string]: unknown;
	};

	const dispatch = createEventDispatcher();
	export let medium: mediaObject;
	export let config: RatingConfig;
	export let current_mode: number;
	export let own_profile: boolean;

	let unique = {};
	let ratingModalOpen = false;
	let modalScore = 0;
	let modalAllowRating = true;
	let modalOpenVersion = 0;
	let modalFocusBubbleIndex: number | null = null;
	let pointerStart: { x: number; y: number } | null = null;
	let pointerStartScore = 0;
	let suppressInlineScoreUpdateUntil = 0;
	let revealedSpoilers: number[] = [];
	let lastNotesValue = '';
	let showReplayInfo = false;
	const TAP_THRESHOLD = 8;

	onMount(() => {
		const handleDocumentClick = () => {
			if (showReplayInfo) showReplayInfo = false;
		};
		document.addEventListener('click', handleDocumentClick);
		return () => document.removeEventListener('click', handleDocumentClick);
	});

	$: decodedNotes = decodeReviewNotes(medium.notes);
	$: visibleNotes = own_profile
		? decodedNotes.bubbles
		: decodedNotes.bubbles.filter((bubble) => !bubble.private);
	$: hasOnlyPrivateNotes =
		!own_profile && decodedNotes.bubbles.length > 0 && visibleNotes.length === 0;
	$: showRepeat = medium.is_rewatch || false;
	$: {
		const currentNotesValue = medium.notes || '';
		if (currentNotesValue !== lastNotesValue) {
			revealedSpoilers = [];
			lastNotesValue = currentNotesValue;
		}
	}

	function resolveScore(rawScore: unknown): number {
		const parsed = Number(rawScore);
		if (Number.isFinite(parsed)) return Math.max(0, Math.min(5, Math.round(parsed * 2) / 2));
		const fallback = Number(medium.rating ?? 0);
		return Number.isFinite(fallback) ? Math.max(0, Math.min(5, Math.round(fallback * 2) / 2)) : 0;
	}

	function handleRatingPointerDown(event: PointerEvent) {
		if (!own_profile) return;
		pointerStartScore = resolveScore(config?.score);
		pointerStart = { x: event.clientX, y: event.clientY };
	}

	function openRatingModal(
		scoreToOpenWith: unknown,
		allowRating = true,
		focusBubbleIndex: number | null = null
	) {
		modalScore = resolveScore(scoreToOpenWith);
		modalAllowRating = allowRating;
		modalFocusBubbleIndex = focusBubbleIndex;
		modalOpenVersion += 1;
		ratingModalOpen = true;
	}

	function handleRatingPointerUp(event: PointerEvent) {
		if (!own_profile || !pointerStart) return;
		const distance = Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y);
		pointerStart = null;
		if (distance <= TAP_THRESHOLD) {
			suppressInlineScoreUpdateUntil = Date.now() + 250;
			config.score = pointerStartScore;
			openRatingModal(pointerStartScore);
		}
	}

	function handleModalScoreChange(event: CustomEvent<{ score: number }>) {
		dispatch('update_score', { new_score: event.detail.score, medium });
	}

	function handleModalNotesChange(event: CustomEvent<{ notes: string }>) {
		if ((medium.notes || '') !== event.detail.notes) {
			dispatch('update_notes', { medium, notes: event.detail.notes });
		}
	}

	function handleInlineScoreChange() {
		if (Date.now() < suppressInlineScoreUpdateUntil) {
			config.score = medium.rating || 0;
			return;
		}
		dispatch('update_score', { new_score: config.score, medium });
	}

	function revealSpoiler(index: number) {
		if (!revealedSpoilers.includes(index)) revealedSpoilers = [...revealedSpoilers, index];
	}

	function getMusicTypeLabel(type?: string) {
		if (type === 'ep') return 'EP';
		if (type === 'single') return 'Single';
		return 'Album';
	}

	function ensureHttps(url: string | null | undefined) {
		return url?.replace(/^http:\/\//, 'https://') || '/placeholder.png';
	}

	function usePlaceholderImage(event: Event) {
		const image = event.currentTarget;
		if (image instanceof HTMLImageElement && !image.src.endsWith('/placeholder.png')) {
			image.src = '/placeholder.png';
		}
	}

	function formatReleaseDate(release?: string) {
		if (!release) return null;
		const storedDate = release.slice(0, 10);
		if (/^\d{4}-01-01$/.test(storedDate)) return storedDate.slice(0, 4);
		const date = new Date(release);
		return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString('de-DE');
	}
</script>

{#key unique}
	<div class="px-2 pb-2">
		<div class="collapse bg-base-100">
			<input id={String(medium.id) + '_u'} type="radio" name="music-accordion" class="hidden" />
			<div
				class="card relative card-side h-[15vh] max-h-[15vh] min-h-[15vh] bg-base-100 select-none"
			>
				<figure class="relative w-[11.25vh] max-w-[11.25vh] min-w-[11.25vh]">
					<img
						src={ensureHttps(medium.image)}
						alt={medium.title || 'Musik'}
						on:error={usePlaceholderImage}
					/>
					{#if showRepeat}
						<div
							class="absolute top-0 left-0 flex h-7 w-7 cursor-pointer items-center justify-center rounded-tl-lg rounded-br-md border border-neutral-400 bg-neutral/80 transition hover:bg-neutral/95"
							role="button"
							tabindex="0"
							on:click|stopPropagation={() => (showReplayInfo = !showReplayInfo)}
							on:keydown={(event) => {
								if (event.key === 'Enter' || event.key === ' ') showReplayInfo = !showReplayInfo;
							}}
							title="Wiederholungs-Informationen"
						>
							<RepeatIcon />
						</div>
					{/if}
				</figure>
				{#if showRepeat && showReplayInfo}
					<div class="absolute top-8 left-0 z-50" role="dialog" tabindex="-1">
						<div class="rounded-lg border border-neutral-400 bg-base-100 p-3 shadow-lg">
							<p class="font-semibold">{medium.rewatch_count || 1} Mal gehört</p>
						</div>
					</div>
				{/if}
				<div
					class="card-body justify-center pl-2"
					role="button"
					tabindex="0"
					on:click={() => {
						const input = document.getElementById(String(medium.id) + '_u');
						if (input instanceof HTMLInputElement) input.checked = !input.checked;
					}}
					on:keydown={(event) => {
						if (event.key === 'Enter' || event.key === ' ') {
							event.preventDefault();
							const input = document.getElementById(String(medium.id) + '_u');
							if (input instanceof HTMLInputElement) input.checked = !input.checked;
						}
					}}
				>
					<div class="w-[107%]">
						<p class="card-title line-clamp-1 text-base font-bold">{medium.title}</p>
						{#if medium.artist}
							<p class="line-clamp-1 text-sm font-light">{medium.artist}</p>
						{/if}
						<p class="line-clamp-1 text-sm font-light">{getMusicTypeLabel(medium.music_type)}</p>
						{#if format_music_genres(medium.genres)}
							<p class="line-clamp-1 text-sm font-light">{format_music_genres(medium.genres)}</p>
						{/if}
						{#if formatReleaseDate(medium.release)}
							<p class="line-clamp-1 text-sm font-light">
								Veröffentlicht: {formatReleaseDate(medium.release)}
							</p>
						{/if}
					</div>
				</div>
				{#if current_mode === 0}
					<div class="my-auto h-fit px-2">
						<button
							type="button"
							class="inline-flex"
							on:pointerdown={handleRatingPointerDown}
							on:pointerup={handleRatingPointerUp}
							on:pointercancel={() => (pointerStart = null)}
							on:click|stopPropagation
						>
							<StarRating {config} on:change={handleInlineScoreChange}></StarRating>
						</button>
					</div>
				{/if}
			</div>

			<div class="collapse-content px-2 pt-0">
				{#if visibleNotes.length > 0}
					<div class="chat-header mt-3">Review-Notizen:</div>
					{#each visibleNotes as bubble, index (index)}
						<div class="chat-start chat">
							{#if bubble.spoiler && !revealedSpoilers.includes(index)}
								<button
									type="button"
									class="chat-bubble w-fit max-w-full text-left"
									on:click={() => revealSpoiler(index)}
								>
									<span class="whitespace-pre-line blur-sm">{bubble.text}</span>
								</button>
							{:else if own_profile}
								<button
									type="button"
									class="chat-bubble w-fit max-w-full text-left"
									on:click={() => openRatingModal(medium.rating || 0, current_mode === 0, index)}
								>
									{bubble.text}
								</button>
							{:else}
								<div class="chat-bubble w-fit max-w-full whitespace-pre-line">{bubble.text}</div>
							{/if}
						</div>
					{/each}
				{:else if !own_profile && hasOnlyPrivateNotes}
					<p class="mt-3 text-sm text-base-content/60">Die Review-Notizen sind privat</p>
				{:else if !own_profile}
					<p class="mt-3 text-sm text-base-content/60">Keine Review-Notizen vorhanden.</p>
				{/if}

				{#if own_profile}
					<div class="mt-3 flex flex-wrap justify-evenly gap-2">
						<button
							type="button"
							class="btn btn-circle w-1/5 text-warning"
							aria-label="Karte bearbeiten"
							on:click={() => dispatch('edit', medium)}><EditNoteIcon /></button
						>
						<button
							type="button"
							class="btn btn-circle w-1/5 text-accent"
							aria-label="Review-Notizen"
							on:click={() => openRatingModal(medium.rating || 0, current_mode === 0)}
							><RateReviewIcon /></button
						>
						<button
							type="button"
							class="btn btn-circle w-1/5 text-primary"
							aria-label="Social-Optionen"
							on:click={() => dispatch('social', medium)}><GroupIcon /></button
						>
						<button
							type="button"
							class="btn btn-circle w-1/5 text-error"
							aria-label="Karte löschen"
							on:click={() => dispatch('delete', medium)}><DeleteIcon /></button
						>
					</div>
				{/if}
			</div>
		</div>
	</div>

	{#key modalOpenVersion}
		<RatingPickerModal
			open={ratingModalOpen}
			title={medium.title || ''}
			score={modalScore}
			notes={medium.notes || ''}
			allowRating={modalAllowRating}
			focusBubbleIndex={modalFocusBubbleIndex}
			on:close={() => (ratingModalOpen = false)}
			on:scoreChange={handleModalScoreChange}
			on:notesChange={handleModalNotesChange}
		/>
	{/key}
{/key}
