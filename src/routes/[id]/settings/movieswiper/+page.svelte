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
	let threshold_passed = 0;
	let swipe_count = 0;
	let swiped_ids: number[] = [];
	let loaded_movies = data.movies;

	async function loadNewCard() {
		let res: Response;
		let try_count = 0;
		while (try_count < 10) {
			if (swipe_count++ % 2 == 0) {
				res = await fetch(`/api/v1/randomMovieFromKeyword?user_pref_id=${Number(data.data?.id)}`, {
					method: 'POST',
					body: JSON.stringify({ swiped_ids }),
					headers: {
						'Content-Type': 'application/json'
					}
				});
			} else {
				res = await fetch('/api/v1/randomMovie', {
					method: 'POST',
					body: JSON.stringify({ swiped_ids }),
					headers: {
						'Content-Type': 'application/json'
					}
				});
			}
			const movie: TmdbMovie = await res.json();
			// console.log(`Loaded: ${movie.title}`);
			swiped_ids.push(movie.id);
			if (movie.id != undefined) {
				loaded_movies = [...loaded_movies, movie];
				break;
			}
			try_count++;
		}
	}

	async function fillMovies(index: number) {
		// console.log(`INDEX: ${index} | MOVIELIST LENGTH: ${loaded_movies.length}`);
		if (loaded_movies.length - index < 10) {
			for (let i = 0; i < 10 - loaded_movies.length - index; i++) {
				await loadNewCard();
			}
		}
	}

	async function swipeHandler(card_details: {
		direction: string;
		index: number;
		element: HTMLElement;
		data: CardData;
	}) {
		if (card_details.data.id != undefined) {
			// card_details:
			// direction: 'left' | 'right' | 'up'
			// index: number
			// element: HTMLElement
			// data: CardData
			switch (card_details.direction) {
				case 'left':
					modifyKeywordPreferences(Number(card_details.data.id), -1);
					break;
				case 'up':
					break;
				case 'right':
					modifyKeywordPreferences(Number(card_details.data.id), 1);
					break;
				default:
					break;
			}
			await loadNewCard();
		} else {
			alert('An error has ocurred. This swipe has not been counted');
			await loadNewCard();
			// console.log(card_details, loaded_movies, loaded_movies[card_details.index]['id']);
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

<div class="h-full bg-base-100">
	<NavBar
		header={'MovieSwiper'}
		settings_button={false}
		nav_back_button={true}
		static_header={true}
		own_profile={undefined}
	></NavBar>
	<div class="w-[80%] h-[60vh] mx-auto">
		<div class="w-full h-full mt-5 relative">
			<div class="h-full overflow-x-hidden">
				<CardSwiper
					bind:swipe
					card_data={(index) => {
						return {
							title: loaded_movies[index].title,
							image: `https://image.tmdb.org/t/p/w500/${loaded_movies[index].poster_path}`,
							id: loaded_movies[index].id
						};
					}}
					on:swiped={async (e) => {
						await fillMovies(e.detail.index);
						await swipeHandler(e.detail);
					}}
					bind:threshold_passed
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
			{#if threshold_passed !== 0}
				<div
					transition:fade={{ duration: 200 }}
					class="absolute w-full h-full inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center text-9xl pointer-events-none z-0"
				>
					{#if threshold_passed === 1}
						<ThumbUp></ThumbUp>
					{:else if threshold_passed === -1}
						<ThumbDown></ThumbDown>
					{:else if threshold_passed === 2}
						<ThumbsUpDown></ThumbsUpDown>
					{/if}
				</div>
			{/if}
		</div>
	</div>
</div>
