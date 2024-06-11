
<script lang="ts">
    import { onMount } from "svelte";
    import type { RecoCardData } from ".";
	import RecommendationCard from "./RecommendationCard.svelte";
  
    export let cards: Array<RecoCardData> = [];
    //export let cardData: (index: number) => RecoCardData;
    console.log(cards.length);

    // $: {
    //     cards = [];
    //     for (let i = 0; i < cardData.length; i++) {
    //         const data = cardData(i)
    //         if (data) {
    //             cards.push(data);
    //         }
    //         console.log("Cards: ", cards )
    //     }
    // }
    // async function fillCardArray() {
    //     for (let i = 0; i < cardData.length; i++) {
	// 		cards.push(cardData(i));
    //         console.log(cardData(i) + "hinzugefügt");
    //         console.log(cardData.length);   
	// 	}
    // }
</script>

<div class="grid grid-cols-4 gap-4">
    {#each cards as card}
        <svelte:component this={RecommendationCard} title={card.title} image={card.image} />
    {/each}
    <svelte:component this={RecommendationCard} title="Mens" image="https://image.tmdb.org/t/p/w200/hpCzLW9Si7kzwh4VQbKy2jmF1k.jpg" />
</div>


  