<script lang="ts">
	export let years: any[];
	export let onSwitch: ((detail: { year: any }) => void) | undefined = undefined;

	function yearSwitch(year_index: number) {
		years.forEach((obj) => (obj.active = false));
		years[year_index].active = true;
		onSwitch?.({ year: years[year_index] });
	}
</script>

<div
	class="dock-sticky scrollbar-hide dock z-10 max-w-full overflow-x-auto overflow-y-hidden bg-base-200 shadow-[0_-4px_10px_rgba(0,0,0,0.3)]"
>
	{#each years as { year, active }, i}
		{#if active}
			<button class="dock-active min-w-20 pb-3 text-lg font-bold" on:click={() => yearSwitch(i)}>
				{year}
			</button>
		{:else}
			<button class="min-w-20 pb-3 text-sm" on:click={() => yearSwitch(i)}>
				{year}
			</button>
		{/if}
	{/each}
</div>

<style>
	:global(.dock.dock-sticky) {
		position: sticky;
		bottom: 0;
		left: 0;
		right: 0;
		z-index: 10;
		padding-bottom: 10px;
	}
</style>
