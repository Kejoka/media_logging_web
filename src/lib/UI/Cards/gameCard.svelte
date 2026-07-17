<script lang="ts">
	import { type mediaObject, type OfflineChangeObject } from '$lib/dbUtils';
	import { createEventDispatcher, onMount } from 'svelte';
	import StarRating from '$lib/UI/Stars_modified/Stars.svelte';
	import Trophy from '$lib/Icons/trophy.svelte';
	import RatingPickerModal from '$lib/UI/Stars_modified/RatingPickerModal.svelte';
	import EditNoteIcon from '$lib/Icons/edit_note.svelte';
	import DeleteIcon from '$lib/Icons/delete.svelte';
	import InfoIcon from '$lib/Icons/info.svelte';
	import GroupIcon from '$lib/Icons/group.svelte';
	import RateReviewIcon from '$lib/Icons/rate_review.svelte';
	import RepeatIcon from '$lib/Icons/repeat.svelte';
	import { decodeReviewNotes } from '$lib/reviewNotes';
	const dispatch = createEventDispatcher();
	export let medium: mediaObject;
	export let config: any;
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
		const handleDocumentClick = (e: MouseEvent) => {
			if (showReplayInfo) {
				showReplayInfo = false;
			}
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

	function openReviewNotesModal(focusBubbleIndex: number | null = null) {
		openRatingModal(medium.rating || 0, current_mode === 0, focusBubbleIndex);
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

	function restart() {
		unique = {};
	}

	function handleImageTap(item: mediaObject) {
		const newValue = 1 - (item.trophy || 0);
		dispatch('update_trophy', {
			medium: item,
			new_value: newValue
		});
		medium = { ...item, trophy: newValue };
	}
</script>

{#key unique}
	<div class="px-2 pb-2">
		<div class="collapse bg-base-100">
			<input id={String(medium.id) + '_g'} type="radio" name="movie-accordion" class="hidden" />
			<!-- Card here -->
			<div
				class="card relative card-side h-[15vh] max-h-[15vh] min-h-[15vh] bg-base-100 select-none"
			>
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
							{#if showRepeat}
								<div
									class="absolute top-0 left-0 z-10 flex h-7 w-7 cursor-pointer items-center justify-center rounded-tl-lg rounded-br-md border border-neutral-400 bg-neutral/80 transition hover:bg-neutral/95"
									role="button"
									tabindex="0"
									on:click={(e) => {
										e.stopPropagation();
										showReplayInfo = !showReplayInfo;
									}}
									on:keydown={(e) => {
										if (e.key === 'Enter' || e.key === ' ') {
											e.stopPropagation();
											showReplayInfo = !showReplayInfo;
										}
									}}
									title="Rewatch-Informationen"
								>
									<div class="flex h-full w-full items-center justify-center opacity-80">
										<RepeatIcon />
									</div>
								</div>
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
				{#if showRepeat && showReplayInfo}
					<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
					<div
						class="absolute top-8 left-0 z-50"
						role="dialog"
						tabindex="-1"
						on:click|stopPropagation
						on:keydown={() => {}}
					>
						<!-- Bubble content -->
						<div class="rounded-lg border border-neutral-400 bg-base-100 p-3 shadow-lg">
							<p class="font-semibold">{medium.rewatch_count || 1} Mal gespielt</p>
						</div>
					</div>
				{/if}
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
								Nutzerbewertung: {medium.averagerating >= 10
									? (medium.averagerating / 10).toFixed(1)
									: medium.averagerating.toFixed(1)}
							</p>
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
				{#if visibleNotes.length > 0}
					<div class="chat-header mt-3">Review-Notizen:</div>
					{#each visibleNotes as bubble, index (index)}
						<div class="chat-start chat">
							{#if own_profile}
								{#if bubble.spoiler && !revealedSpoilers.includes(index)}
									<button
										type="button"
										class="chat-bubble w-fit max-w-full cursor-pointer text-left wrap-break-word transition"
										on:click={() => revealSpoiler(index)}
									>
										<span class="whitespace-pre-line blur-sm">{bubble.text}</span>
									</button>
								{:else}
									<button
										type="button"
										class="chat-bubble w-fit max-w-full cursor-pointer text-left wrap-break-word whitespace-pre-line transition hover:bg-base-300"
										on:click={() => openReviewNotesModal(index)}
									>
										{bubble.text}
									</button>
								{/if}
							{:else if bubble.spoiler && !revealedSpoilers.includes(index)}
								<button
									type="button"
									class="chat-bubble w-fit max-w-full cursor-pointer text-left wrap-break-word transition"
									on:click={() => revealSpoiler(index)}
								>
									<span class="whitespace-pre-line blur-sm">{bubble.text}</span>
								</button>
							{:else}
								<div
									class="chat-bubble w-fit max-w-full wrap-break-word whitespace-pre-line transition"
								>
									{bubble.text}
								</div>
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
							title="Karte bearbeiten"
							on:click={() => dispatch('edit', medium)}
						>
							<EditNoteIcon />
						</button>
						<button
							type="button"
							class="btn btn-circle w-1/5 text-accent"
							aria-label="Review-Notizen"
							title="Review-Notizen"
							on:click={() => openReviewNotesModal()}
						>
							<RateReviewIcon />
						</button>
						<button
							type="button"
							class="btn btn-circle w-1/5 text-primary"
							aria-label="Social-Optionen"
							title="Social-Optionen"
							on:click={() => dispatch('social', medium)}
						>
							<GroupIcon />
						</button>
						<button
							type="button"
							class="btn btn-circle w-1/5 text-error"
							aria-label="Karte löschen"
							title="Karte löschen"
							on:click={() => dispatch('delete', medium)}
						>
							<DeleteIcon />
						</button>
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
			on:close={() => {
				ratingModalOpen = false;
			}}
			on:scoreChange={handleModalScoreChange}
			on:notesChange={handleModalNotesChange}
		/>
	{/key}
{/key}
