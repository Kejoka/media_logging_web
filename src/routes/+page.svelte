<script lang="ts">
	import { CardSwiper, type Direction } from '$lib/CardSwiper';
	import { fade } from 'svelte/transition';
	import type { PageServerData } from './$types';
	import type { TmdbMovie } from './+page.server';
	/** @type {import('./$types').PageServerData} */
	export let data: PageServerData;

	let swipe: (direction?: Direction) => void;
	let thresholdPassed = 0;

	async function loadNewCard() {
		const res = await fetch('http://localhost:5500/randomMovie');
		const movie: TmdbMovie = await res.json();
		data.movies = [...data.movies, movie];
	}

	function swipeHandler(cardDetails: any) {
		// cardDetails:
		// direction: 'left' | 'right'
		// index: number
		// element: HTMLElement
		// data: CardData
		console.log(`Swiped ${cardDetails.data.title} ${cardDetails.direction}`);
		loadNewCard();
	}
</script>

<div class="h-[100svh] w-[100svw] p-2 flex items-center justify-center overflow-hidden">
	<div class="w-full h-full max-w-xl relative">
		<CardSwiper
			bind:swipe
			cardData={(index) => {
				return {
					title: data.movies[index].title,
					image: `https://image.tmdb.org/t/p/w500/${data.movies[index].poster_path}`
				};
			}}
			on:swiped={(e) => {
				swipeHandler(e.detail);
			}}
			bind:thresholdPassed
		/>

		<button
			class="absolute bottom-1 left-1 p-3 px-4 bg-white/50 backdrop-blur-sm rounded-full z-10 text-3xl"
			on:click={() => swipe('left')}
		>
			👎
		</button>

		<button
			class="absolute bottom-1 right-1 p-3 px-4 bg-white/50 backdrop-blur-sm rounded-full z-10 text-3xl"
			on:click={() => swipe('right')}
		>
			👍
		</button>
	</div>

	{#if thresholdPassed !== 0}
		<div
			transition:fade={{ duration: 200 }}
			class="absolute w-full h-full inset-0 bg-white/20 backdrop-blur-sm flex items-center justify-center text-9xl pointer-events-none"
		>
			{thresholdPassed > 0 ? '👍' : '👎'}
		</div>
	{/if}
</div>
