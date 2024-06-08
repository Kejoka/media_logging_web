<script lang="ts">
	import { CardSwiper, type Direction } from '$lib/CardSwiper';
	import { fade } from 'svelte/transition';
	import type { PageServerData } from './$types';
	import type { TmdbMovie } from './+page.server';
	/** @type {import('./$types').PageServerData} */
	export let data: PageServerData;
	import { page } from '$app/stores';
	import Fab, { Icon } from '@smui/fab';
	console.log('Loaded profile: ' + $page.params.id);

	let swipe: (direction?: Direction) => void;
	let thresholdPassed = 0;

	async function loadNewCard() {
		const res = await fetch('/api/v1/randomMovie');
		const movie: TmdbMovie = await res.json();
		data.movies = [...data.movies, movie];
	}

	async function logKeywords(id: number) {
		const res = await fetch(`/api/v1/getKeywords?id=${id}`);
		console.log(await res.json());
	}

	function swipeHandler(cardDetails: any) {
		// cardDetails:
		// direction: 'left' | 'right'
		// index: number
		// element: HTMLElement
		// data: CardData
		console.log(`Swiped ${cardDetails.data.title} ${cardDetails.direction}`);
		logKeywords(cardDetails.data.id);
		loadNewCard();
	}
</script>

<div class="h-[85svh] flex items-center justify-center">
	<div class="w-full h-full max-w-xl relative">
		<CardSwiper
			bind:swipe
			cardData={(index) => {
				return {
					title: data.movies[index].title,
					image: `https://image.tmdb.org/t/p/w500/${data.movies[index].poster_path}`,
					id: data.movies[index].id
				};
			}}
			on:swiped={(e) => {
				swipeHandler(e.detail);
			}}
			bind:thresholdPassed
		/>
		<div class="absolute flex -bottom-8 w-full justify-evenly order-first">
			<Fab class=" bg-[#424242]/85 z-10" on:click={() => swipe('left')}>
				<Icon class="material-icons">thumb_down</Icon>
			</Fab>
			<Fab class=" bg-[#424242]/85 z-10" on:click={() => swipe('up')}>
				<Icon class="material-icons">thumbs_up_down</Icon>
			</Fab>
			<Fab class=" bg-[#424242]/85 z-10" on:click={() => swipe('right')}>
				<Icon class="material-icons">thumb_up</Icon>
			</Fab>
		</div>
		{#if thresholdPassed !== 0}
			<div
				transition:fade={{ duration: 200 }}
				class="absolute w-full h-full inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center text-9xl pointer-events-none z-0"
			>
				{#if thresholdPassed === 1}
					<Icon class="material-icons opacity-70 scale-[5]">thumb_up</Icon>
				{:else if thresholdPassed === -1}
					<Icon class="material-icons opacity-70 scale-[5]">thumb_down</Icon>
				{:else if thresholdPassed === 2}
					<Icon class="material-icons opacity-70 scale-[5]">thumbs_up_down</Icon>
				{/if}
			</div>
		{/if}
	</div>
</div>
