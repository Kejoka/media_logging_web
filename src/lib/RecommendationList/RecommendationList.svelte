
<script lang="ts">
    import { onMount } from "svelte";
    import type { TmdbMovie } from "../../routes/devtools/[id]/movieswiper/proxy+page.server";
	import RecommendationCard from "./RecommendationCard.svelte";
  
    export let cards: Array<TmdbMovie> = [];

</script>

<div class="grid grid-cols-4 gap-4">
    {#each cards as card}
        <svelte:component this={RecommendationCard} title={card.title} image={`https://image.tmdb.org/t/p/w200${card.poster_path}`} movieId={card.id} />
    {/each}
</div>


  