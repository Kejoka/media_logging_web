<script lang="ts">
	import { createEventDispatcher, onDestroy } from 'svelte';
	import Star from './Star.svelte';
	import NoteBubbleEditor from '$lib/UI/NoteBubbleEditor.svelte';

	export let open = false;
	export let score = 0;
	export let title = '';
	export let notes: string | null | undefined = '';
	export let allowRating = true;
	export let focusBubbleIndex: number | null = null;

	const dispatch = createEventDispatcher<{
		close: void;
		scoreChange: { score: number };
		notesChange: { notes: string };
	}>();

	let localScore = 0;
	let localNotes = '';
	let wasOpen = false;
	let autosaveTimeout: ReturnType<typeof setTimeout> | null = null;
	let lastDispatchedNotes = '';
	let insertedHistoryEntry = false;

	function clampScore(value: number): number {
		const clamped = Math.max(0, Math.min(5, value));
		return Math.round(clamped * 2) / 2;
	}

	$: if (open && !wasOpen) {
		localScore = clampScore(score ?? 0);
		localNotes = notes || '';
		lastDispatchedNotes = (notes || '').trim();
		wasOpen = true;
		insertBackGestureGuard();
	} else if (!open && wasOpen) {
		wasOpen = false;
		clearAutosave();
		insertedHistoryEntry = false;
	}

	$: if (open && localNotes.trim() !== lastDispatchedNotes) {
		scheduleNotesAutosave();
	}

	function updateScore(value: number) {
		localScore = clampScore(value);
		dispatch('scoreChange', { score: localScore });
	}

	function clearAutosave() {
		if (autosaveTimeout) {
			clearTimeout(autosaveTimeout);
			autosaveTimeout = null;
		}
	}

	function dispatchNotes() {
		clearAutosave();
		const normalizedNotes = localNotes.trim();
		if (normalizedNotes === lastDispatchedNotes) {
			return;
		}
		lastDispatchedNotes = normalizedNotes;
		dispatch('notesChange', { notes: normalizedNotes });
	}

	function scheduleNotesAutosave() {
		clearAutosave();
		autosaveTimeout = setTimeout(dispatchNotes, 900);
	}

	function closeModal(fromHistory = false) {
		updateScore(localScore);
		dispatchNotes();
		dispatch('close');
		if (!fromHistory && insertedHistoryEntry && typeof history !== 'undefined') {
			insertedHistoryEntry = false;
			history.back();
		}
	}

	function insertBackGestureGuard() {
		if (typeof history === 'undefined' || insertedHistoryEntry) {
			return;
		}
		history.pushState({ ratingModalOpen: true }, '', location.href);
		insertedHistoryEntry = true;
	}

	function handlePopState() {
		if (!open) {
			return;
		}
		insertedHistoryEntry = false;
		closeModal(true);
	}

	function handleKeydown(event: KeyboardEvent) {
		if (!open || event.key !== 'Escape') {
			return;
		}
		event.preventDefault();
		closeModal();
	}

	onDestroy(() => {
		clearAutosave();
	});
</script>

<svelte:window on:keydown={handleKeydown} on:popstate={handlePopState} />

<div class="modal" class:modal-open={open} role="dialog" aria-modal={open}>
	<div class="scrollbar-hide modal-box max-h-[80dvh] overflow-y-auto">
		{#if title}
			<p class="mb-4 line-clamp-1 text-center text-xl text-base-content/70">{title}</p>
		{/if}
		{#if allowRating}
			<div class="mb-4 flex justify-center gap-2">
				{#each [1, 2, 3, 4, 5] as starNumber (starNumber)}
					{@const fill = localScore >= starNumber ? 1 : localScore >= starNumber - 0.5 ? 0.5 : 0}
					<div class="h-8 w-8">
						<Star
							id={`modal-star-${starNumber}`}
							fillPercentage={fill}
							starConfig={{
								size: 28,
								fillColor: 'var(--color-accent)',
								strokeColor: 'var(--color-accent)',
								unfilledColor: 'var(--color-base-300)',
								strokeUnfilledColor: 'var(--color-base-300)'
							}}
							readOnly={true}
						/>
					</div>
				{/each}
			</div>
			<div class="mx-auto w-full max-w-xs">
				<input
					type="range"
					class="range mx-auto block range-accent range-sm"
					min="0"
					max="5"
					step="0.5"
					bind:value={localScore}
				/>
			</div>
			<p class="mt-3 text-center text-sm font-semibold">
				{#if localScore === 0}
					Keine Bewertung
				{:else}
					{localScore.toFixed(1)} / 5.0
				{/if}
			</p>
		{/if}

		<div class="mt-5">
			<p class="mb-2 text-sm font-semibold">Review-Notizen</p>
			<div class="rounded-lg border border-base-content/10 bg-base-200/40 p-3">
				<NoteBubbleEditor bind:value={localNotes} {focusBubbleIndex} />
			</div>
		</div>
	</div>
	<button type="button" class="modal-backdrop" aria-label="Modal schließen" on:click={() => closeModal()}
		>Close</button
	>
</div>
