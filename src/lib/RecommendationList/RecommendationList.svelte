<script lang="ts">
	import type { RecoCardData } from '.';
	import RecommendationCard from './RecommendationCard.svelte';

	export let cards: Array<RecoCardData> = [];
</script>

<div class="grid grid-cols-4 gap-4">
	{#each cards as card}
		<svelte:component this={RecommendationCard} title={card.title} image={card.image} />
	{/each}
</div>
