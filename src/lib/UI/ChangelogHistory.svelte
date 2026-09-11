<script lang="ts">
	import { allReleaseNotes } from '$lib/releaseNotes';

	let isOpen = $state(false);
	let selectedIndex = $state(0);
	let selectedRelease = $derived(allReleaseNotes[selectedIndex]);

	function openHistory() {
		selectedIndex = 0;
		isOpen = true;
	}

	function closeHistory() {
		isOpen = false;
	}

	function showPrevious() {
		if (selectedIndex < allReleaseNotes.length - 1) {
			selectedIndex += 1;
		}
	}

	function showNext() {
		if (selectedIndex > 0) {
			selectedIndex -= 1;
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (!isOpen) return;
		if (event.key === 'Escape') closeHistory();
		if (event.key === 'ArrowLeft') showPrevious();
		if (event.key === 'ArrowRight') showNext();
	}
</script>

<button
	type="button"
	class="w-full cursor-pointer rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-neutral-300 transition hover:bg-white/10 focus:outline-none"
	onclick={openHistory}
>
	Changelogs ansehen
</button>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen && selectedRelease}
	<div
		class="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4 py-6 backdrop-blur-sm"
		role="presentation"
		onclick={(event) => event.target === event.currentTarget && closeHistory()}
	>
		<div
			class="max-h-[min(80vh,42rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-base-300 shadow-2xl"
			role="dialog"
			tabindex="-1"
			aria-modal="true"
			aria-labelledby="changelog-history-title"
			aria-describedby="changelog-history-summary"
		>
			<div
				class="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4 sm:px-6"
			>
				<div>
					<p class="mb-1 text-xs font-semibold tracking-[0.18em] text-blue-300 uppercase">
						Version {selectedRelease.version}
					</p>
					<h2 id="changelog-history-title" class="text-2xl font-bold text-white">
						{selectedRelease.title}
					</h2>
				</div>
				<button
					type="button"
					class="btn btn-circle text-xl text-neutral-300 btn-ghost btn-sm"
					onclick={closeHistory}
					aria-label="Changelogs schließen"
				>
					<span aria-hidden="true">×</span>
				</button>
			</div>

			<div class="space-y-5 px-5 py-5 sm:px-6 sm:py-6">
				<p id="changelog-history-summary" class="text-sm leading-6 text-neutral-300">
					{selectedRelease.summary}
				</p>

				<ul class="space-y-3 text-sm leading-6 text-neutral-200">
					{#each selectedRelease.items as item (item)}
						<li class="flex gap-3">
							<span class="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-300" aria-hidden="true"
							></span>
							<span>{item}</span>
						</li>
					{/each}
				</ul>

				<div class="flex items-center justify-between gap-3 border-t border-white/10 pt-4">
					<button
						type="button"
						class="btn btn-ghost btn-sm"
						disabled={selectedIndex >= allReleaseNotes.length - 1}
						onclick={showPrevious}
					>
						← Älter
					</button>
					<span class="text-xs text-neutral-500">
						{selectedIndex + 1} / {allReleaseNotes.length}
					</span>
					<button
						type="button"
						class="btn btn-ghost btn-sm"
						disabled={selectedIndex === 0}
						onclick={showNext}
					>
						Neuer →
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
