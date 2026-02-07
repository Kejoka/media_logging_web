<script lang="ts">
	import Backlog from '$lib/Icons/backlog.svelte';
	import Shelf from '$lib/Icons/shelf.svelte';
	import Stats from '$lib/Icons/stats.svelte';

	export let current_mode: number;
	export let onSwitchMode: ((detail: { mode: number }) => void) | undefined = undefined;

	function modeSwitch(mode: number) {
		onSwitchMode?.({ mode });
	}
</script>

<div role="tablist" class="tabs tabs-border bg-base-100 flex-row justify-evenly h-fit w-full py-2">
	<button
		role="tab"
		class="tab {current_mode == 0 ? 'tab-active' : ''}"
		on:click={() => modeSwitch(0)}
	>
	<div class="flex-row w-fit flex items-center gap-2">
		<Shelf></Shelf>
		<p>Logging</p>
	</div>
	</button>
	<button
		role="tab"
		class="tab {current_mode == 1 ? 'tab-active' : ''}"
		on:click={() => modeSwitch(1)}
	>
	<div class="flex-row w-fit flex items-center gap-2">
		<Backlog></Backlog>
		<p>Backlog</p>
	</div>
	</button>
	<button
		role="tab"
		class="tab {current_mode == 2 ? 'tab-active' : ''}"
		on:click={() => modeSwitch(2)}
	>
	<div class="flex-row w-fit flex items-center gap-2">
		<Stats></Stats>
		<p>Stats</p>
	</div>
	</button>
</div>
