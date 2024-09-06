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

<div class="btm-nav h-[5%] mt-3 overflow-x-auto">
	{#each years as { year, active }, i}
		{#if active}
			<button class="active font-bold text-lg min-w-16" on:click={() => yearSwitch(i)}>
				{year}
			</button>
		{:else}
			<button class="text-sm min-w-16" on:click={() => yearSwitch(i)}>
				{year}
			</button>
		{/if}
	{/each}
</div>
