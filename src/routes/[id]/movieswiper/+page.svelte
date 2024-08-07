<script lang="ts">
	import { supabase } from '$lib/supabaseClient';
	import { CardSwiper, type CardData, type Direction } from '$lib/CardSwiper';
	import { fade } from 'svelte/transition';
	import type { PageServerData } from './$types';
	import type { TmdbMovie } from './+page.server';
	/** @type {import('./$types').PageServerData} */
	export let data: PageServerData;
	import Fab, { Icon } from '@smui/fab';

	let swipe: (direction?: Direction) => void;
	let thresholdPassed = 0;
	let swipeCount = 0;
	let swipedIds: number[] = [];

	async function loadNewCard() {
		let res: Response;
		let try_count = 0;
		while (try_count < 10) {
			if (swipeCount % 2 == 0) {
				res = await fetch(`/api/v1/randomMovieFromKeyword?user_pref_id=${Number(data.data?.id)}`, {
					method: 'POST',
					body: JSON.stringify({ swipedIds }),
					headers: {
						'Content-Type': 'application/json'
					}
				});
			} else {
				res = await fetch('/api/v1/randomMovie', {
					method: 'POST',
					body: JSON.stringify({ swipedIds }),
					headers: {
						'Content-Type': 'application/json'
					}
				});
			}
			const movie: TmdbMovie = await res.json();
			if (movie.id != undefined) {
				try_count = 199;
				data.movies = [...data.movies, movie];
			}
			try_count++;
		}
	}

	async function swipeHandler(cardDetails: {
		direction: string;
		index: number;
		element: HTMLElement;
		data: CardData;
	}) {
		if (cardDetails.data.id != undefined) {
			swipedIds.push(Number(cardDetails.data.id));
			swipeCount++;
			// cardDetails:
			// direction: 'left' | 'right' | 'up'
			// index: number
			// element: HTMLElement
			// data: CardData
			switch (cardDetails.direction) {
				case 'left':
					modifyKeywordPreferences(Number(cardDetails.data.id), -1);
					break;
				case 'up':
					break;
				case 'right':
					modifyKeywordPreferences(Number(cardDetails.data.id), 1);
					break;
				default:
					break;
			}
			await loadNewCard();
		} else {
			swipeCount++;
			alert('An error has ocurred. This swipe has not been counted');
			await loadNewCard();
			await loadNewCard();
			// console.log(cardDetails, data.movies, data.movies[cardDetails.index]['id']);
		}
	}

	async function modifyKeywordPreferences(id: number, value: number) {
		const keywords = await fetch(`/api/v1/getKeywords?id=${id}`);
		for (let keyword of await keywords.json()) {
			const { error } = await supabase.rpc('upsert_and_change_factor', {
				r_user_preference_id: Number(data.data?.id),
				r_tmdb_id: keyword.id,
				r_name: keyword.name,
				r_factor: value
			});
			if (error) {
				console.error('Error upserting preferences:', error);
				throw new Error('Failed to upsert preferences');
			}
		}
	}
</script>

<svelte:head>
	<title>MovieSwiper</title>
</svelte:head>

<div class="h-[85svh] flex items-center justify-center">
	<div class="w-full h-full max-w-xl relative">
		<CardSwiper
			bind:swipe
			cardData={(index) => {
				// console.log(index, data.movies.length, data.movies, data.movies[index].title);
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
