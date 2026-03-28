<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import Star from './Star.svelte';

	export let open = false;
	export let score = 0;
	export let title = '';

	const dispatch = createEventDispatcher<{
		close: void;
		scoreChange: { score: number };
	}>();

	let localScore = 0;

	function clampScore(value: number): number {
		const clamped = Math.max(0, Math.min(5, value));
		return Math.round(clamped * 2) / 2;
	}

	$: if (open) {
		localScore = clampScore(score ?? 0);
	}

	function closeModal() {
		dispatch('close');
	}

	function updateScore(value: number) {
		localScore = clampScore(value);
		dispatch('scoreChange', { score: localScore });
	}
</script>

<div class="modal" class:modal-open={open} role="dialog" aria-modal={open}>
	<div class="modal-box">
		<h3 class="mb-2 text-center text-lg font-bold">Bewertung</h3>
		{#if title}
			<p class="mb-4 line-clamp-1 text-center text-sm text-base-content/70">{title}</p>
		{/if}
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
				on:input={(event) => updateScore(Number((event.currentTarget as HTMLInputElement).value))}
			/>
		</div>
		<p class="mt-3 text-center text-sm font-semibold">
			{#if localScore === 0}
				Keine Bewertung
			{:else}
				{localScore.toFixed(1)} / 5.0
			{/if}
		</p>
	</div>
	<button type="button" class="modal-backdrop" aria-label="Modal schließen" on:click={closeModal}
		>Close</button
	>
</div>
