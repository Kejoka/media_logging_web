<script lang="ts">
	import { onMount } from 'svelte';

	type ReleaseNote = {
		version: string;
		title: string;
		summary: string;
		items: string[];
	};

	let release = $state<ReleaseNote | null>(null);
	let isOpen = $state(false);
	let isAcknowledging = $state(false);
	let error = $state<string | null>(null);

	onMount(() => {
		void loadReleaseNotice();
	});

	async function loadReleaseNotice() {
		try {
			const response = await fetch('/api/v1/getReleaseNotice');
			if (!response.ok) {
				throw new Error('Release notice could not be loaded');
			}

			const data = (await response.json()) as { show?: boolean; release?: ReleaseNote };
			if (data.show && data.release) {
				release = data.release;
				isOpen = true;
			}
		} catch (loadError) {
			// The release notice is optional and should not interrupt normal app use.
			console.error('Could not load release notice:', loadError);
		}
	}

	async function acknowledgeRelease() {
		if (!release || isAcknowledging) return;

		isAcknowledging = true;
		error = null;
		try {
			const response = await fetch('/api/v1/acknowledgeRelease', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' }
			});

			if (!response.ok) {
				throw new Error('Release notice could not be acknowledged');
			}

			isOpen = false;
		} catch (acknowledgeError) {
			error = 'Die Änderung konnte noch nicht gespeichert werden. Bitte versuche es erneut.';
			console.error('Could not acknowledge release notice:', acknowledgeError);
		} finally {
			isAcknowledging = false;
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (isOpen && event.key === 'Escape') {
			void acknowledgeRelease();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen && release}
	<div
		class="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4 py-6 backdrop-blur-sm"
		role="presentation"
		onclick={(event) => event.target === event.currentTarget && void acknowledgeRelease()}
	>
		<div
			class="max-h-[min(80vh,42rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-base-300 shadow-2xl"
			role="dialog"
			tabindex="-1"
			aria-modal="true"
			aria-labelledby="release-notice-title"
			aria-describedby="release-notice-summary"
		>
			<div
				class="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4 sm:px-6"
			>
				<div>
					<p class="mb-1 text-xs font-semibold tracking-[0.18em] text-blue-300 uppercase">
						Version {release.version}
					</p>
					<h2 id="release-notice-title" class="text-2xl font-bold text-white">{release.title}</h2>
				</div>
				<button
					type="button"
					class="btn btn-circle text-xl text-neutral-300 btn-ghost btn-sm"
					disabled={isAcknowledging}
					onclick={() => void acknowledgeRelease()}
					aria-label="Changelog schließen"
				>
					<span aria-hidden="true">×</span>
				</button>
			</div>

			<div class="space-y-5 px-5 py-5 sm:px-6 sm:py-6">
				<p id="release-notice-summary" class="text-sm leading-6 text-neutral-300">
					{release.summary}
				</p>

				<ul class="space-y-3 text-sm leading-6 text-neutral-200">
					{#each release.items as item (item)}
						<li class="flex gap-3">
							<span class="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-300" aria-hidden="true"
							></span>
							<span>{item}</span>
						</li>
					{/each}
				</ul>

				{#if error}
					<p
						class="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300"
					>
						{error}
					</p>
				{/if}

				<button
					type="button"
					class="ml-action-positive ml-focus w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
					disabled={isAcknowledging}
					onclick={() => void acknowledgeRelease()}
				>
					{isAcknowledging ? 'Speichern...' : 'Alles klar'}
				</button>
			</div>
		</div>
	</div>
{/if}
