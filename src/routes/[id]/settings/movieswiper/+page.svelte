<script lang="ts">
	import { supabase } from '$lib/supabaseClient';
	import { CardSwiper, type CardData, type Direction } from '$lib/CardSwiper';
	import { fade } from 'svelte/transition';
	import type { PageServerData } from './$types';
	import type { TmdbMovie } from './+page.server';
	import ThumbUp from '$lib/Icons/thumb_up.svelte';
	import ThumbDown from '$lib/Icons/thumb_down.svelte';
	import ThumbsUpDown from '$lib/Icons/thumbs_up_down.svelte';
	import NavBar from '$lib/UI/navBar.svelte';
	/** @type {import('./$types').PageServerData} */
	export let data: PageServerData;

	let swipe: (direction?: Direction) => void;
	let thresholdPassed = 0;
	let swipeCount = 0;
	let swipedIds: number[] = [];
	let loadedMovies = data.movies;

	async function loadNewCard() {
		let res: Response;
		let try_count = 0;
		while (try_count < 10) {
			if (swipeCount++ % 2 == 0) {
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
			// console.log(`Loaded: ${movie.title}`);
			swipedIds.push(movie.id);
			if (movie.id != undefined) {
				loadedMovies = [...loadedMovies, movie];
				break;
			}
			try_count++;
		}
	}

	async function fillMovies(index: number) {
		// console.log(`INDEX: ${index} | MOVIELIST LENGTH: ${loadedMovies.length}`);
		if (loadedMovies.length - index < 10) {
			for (let i = 0; i < 10 - loadedMovies.length - index; i++) {
				await loadNewCard();
			}
		}
	}

	async function swipeHandler(cardDetails: {
		direction: string;
		index: number;
		element: HTMLElement;
		data: CardData;
	}) {
		if (cardDetails.data.id != undefined) {
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
			alert('An error has ocurred. This swipe has not been counted');
			await loadNewCard();
			// console.log(cardDetails, loadedMovies, loadedMovies[cardDetails.index]['id']);
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

<div>
	<NavBar header={'MovieSwiper'} settingsButton={false} navBackButton={true} staticHeader={true}
	></NavBar>
	<div class="w-[80%] h-[60vh] mx-auto">
		<div class="w-full h-full mt-5 relative">
			<div class="h-full overflow-x-hidden">
				<CardSwiper
					bind:swipe
					cardData={(index) => {
						return {
							title: loadedMovies[index].title,
							image: `https://image.tmdb.org/t/p/w500/${loadedMovies[index].poster_path}`,
							id: loadedMovies[index].id
						};
					}}
					on:swiped={async (e) => {
						await fillMovies(e.detail.index);
						await swipeHandler(e.detail);
					}}
					bind:thresholdPassed
				/>
			</div>
			<div class="absolute flex -bottom-8 w-full justify-evenly order-first">
				<button class="btn btn-circle" on:click={() => swipe('left')}>
					<ThumbDown></ThumbDown>
				</button>
				<button class="btn btn-circle" on:click={() => swipe('up')}>
					<ThumbsUpDown></ThumbsUpDown>
				</button>
				<button class="btn btn-circle" on:click={() => swipe('right')}>
					<ThumbUp></ThumbUp>
				</button>
			</div>
			{#if thresholdPassed !== 0}
				<div
					transition:fade={{ duration: 200 }}
					class="absolute w-full h-full inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center text-9xl pointer-events-none z-0"
				>
					{#if thresholdPassed === 1}
						<ThumbUp></ThumbUp>
					{:else if thresholdPassed === -1}
						<ThumbDown></ThumbDown>
					{:else if thresholdPassed === 2}
						<ThumbsUpDown></ThumbsUpDown>
					{/if}
				</div>
			{/if}
		</div>
	</div>
</div>
