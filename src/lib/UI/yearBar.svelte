<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();
	export let years: any[];

	function yearSwitch(year_index: number) {
		years.forEach((obj) => (obj.active = false));
		years[year_index].active = true;
		dispatch('switch', {
			year: years[year_index]
		});
	}
</script>

<div class="dock static! h-fit pt-2 w-full overflow-x-auto overflow-y-hidden pb-6">
	{#each years as { year, active }, i}
		{#if active}
			<button class="dock-active min-w-20 text-lg font-bold pb-3" on:click={() => yearSwitch(i)}>
				{year}
			</button>
		{:else}
			<button class="min-w-20 text-sm pb-3" on:click={() => yearSwitch(i)}>
				{year}
			</button>
		{/if}
	{/each}
</div>
