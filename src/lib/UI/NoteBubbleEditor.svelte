<script lang="ts">
	import { tick } from 'svelte';
	import { decodeReviewNotes, encodeReviewNotes, type ReviewNoteBubble } from '$lib/reviewNotes';

	export let value: string | null | undefined = '';
	export let focusBubbleIndex: number | null = null;

	let bubbles: ReviewNoteBubble[] = [];
	let bubbleTextareas: Array<HTMLTextAreaElement | undefined> = [];
	let lastSerialized = '';
	let loadedFromLegacy = false;
	let lastFocusedBubbleIndex: number | null = null;

	$: incomingValue = value || '';
	$: if (incomingValue !== lastSerialized) {
		const decoded = decodeReviewNotes(incomingValue);
		bubbles = decoded.bubbles.map((bubble) => ({ ...bubble }));
		loadedFromLegacy = decoded.isLegacy;
		lastSerialized = incomingValue;
	}

	$: if (
		focusBubbleIndex !== null &&
		focusBubbleIndex !== lastFocusedBubbleIndex &&
		focusBubbleIndex >= 0 &&
		focusBubbleIndex < bubbles.length
	) {
		void tick().then(() => {
			const target = bubbleTextareas[focusBubbleIndex];
			if (target) {
				target.focus();
				lastFocusedBubbleIndex = focusBubbleIndex;
			}
		});
	}

	function persistBubbles() {
		const encoded = encodeReviewNotes(bubbles);
		value = encoded;
		lastSerialized = encoded;
	}

	function updateBubbleText(index: number, text: string) {
		bubbles[index] = { ...bubbles[index], text };
		bubbles = [...bubbles];
		persistBubbles();
	}

	function toggleSpoiler(index: number, checked: boolean) {
		bubbles[index] = { ...bubbles[index], spoiler: checked };
		bubbles = [...bubbles];
		persistBubbles();
	}

	function togglePrivate(index: number, checked: boolean) {
		bubbles[index] = { ...bubbles[index], private: checked };
		bubbles = [...bubbles];
		persistBubbles();
	}

	function addBubble() {
		bubbles = [...bubbles, { text: '', spoiler: false, private: false }];
		persistBubbles();
	}

	function removeBubble(index: number) {
		bubbles = bubbles.filter((_, bubbleIndex) => bubbleIndex !== index);
		persistBubbles();
	}
</script>

<div class="flex flex-col gap-3">
	{#if loadedFromLegacy}
		<div class="rounded-md border border-warning/40 bg-warning/10 p-2 text-xs text-warning-content">
			Vorhandene Review-Notizen wurden aus dem alten Format geladen. Beim Speichern werden sie ins
			neue Format migriert.
		</div>
	{/if}

	{#if bubbles.length === 0}
		<p class="rounded-md bg-base-200/50 px-3 py-2 text-sm text-base-content/65">
			Noch keine Review-Notizen vorhanden.
		</p>
	{/if}

	{#each bubbles as bubble, index (index)}
		<div class="rounded-lg border border-base-300 bg-base-200 p-3">
			<div class="mb-2 flex items-center justify-between">
				<p class="text-sm font-semibold">Notiz {index + 1}</p>
				<button
					type="button"
					class="btn btn-xs btn-error"
					on:click={() => removeBubble(index)}
					aria-label={`Notiz ${index + 1} entfernen`}
				>
					Entfernen
				</button>
			</div>

			<textarea
				class="textarea-bordered textarea h-20 w-full"
				bind:this={bubbleTextareas[index]}
				value={bubble.text}
				on:input={(event) =>
					updateBubbleText(index, (event.currentTarget as HTMLTextAreaElement).value)}
				placeholder="Notiztext"
			></textarea>

			<label class="mt-2 flex cursor-pointer items-center gap-2 text-sm">
				<input
					type="checkbox"
					class="checkbox checkbox-sm"
					checked={bubble.spoiler}
					on:change={(event) =>
						toggleSpoiler(index, (event.currentTarget as HTMLInputElement).checked)}
				/>
				<span>Als Spoiler markieren</span>
			</label>

			<label class="mt-2 flex cursor-pointer items-center gap-2 text-sm">
				<input
					type="checkbox"
					class="checkbox checkbox-sm"
					checked={bubble.private}
					on:change={(event) =>
						togglePrivate(index, (event.currentTarget as HTMLInputElement).checked)}
				/>
				<span>Privat (nur für dich sichtbar)</span>
			</label>
		</div>
	{/each}

	<div class="flex justify-start">
		<button type="button" class="btn btn-outline btn-sm" on:click={addBubble}
			>Neue Notizblase</button
		>
	</div>
</div>
