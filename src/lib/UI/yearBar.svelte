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

<div class="btm-nav static">
	{#each years as { year, active }, i}
		{#if active}
			<button class="active" on:click={() => yearSwitch(i)}>
				{year}
			</button>
		{:else}
			<button class="" on:click={() => yearSwitch(i)}>
				{year}
			</button>
		{/if}
	{/each}
</div>
