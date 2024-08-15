<script lang="ts">
	import type { RecoCardData } from '.';
	import RecommendationCard from './RecommendationCard.svelte';

	export let cards: Array<RecoCardData> = [];
</script>

<div class="grid grid-cols-3 gap-2">
	{#each cards as card}
		<svelte:component this={RecommendationCard} title={card.title} image={card.image} />
	{/each}
</div>
