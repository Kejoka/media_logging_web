<script lang="ts">
	import type { TmdbMovie } from './+page.server';
	import RecommendationList from '$lib/RecommendationList/RecommendationList.svelte';
	import { onMount } from 'svelte';
	import CircularProgress from '@smui/circular-progress';

	let dummyArray: Array<TmdbMovie> = [];
	let isLoading = true;
	let isFetchingMoreMovies = false;

	async function loadNewMovies(amount: number) {
		let movies: Array<TmdbMovie> = [];
		while (movies.length < amount) {
			try {
				let res = await fetch(`/api/v1/randomMovie`);
				if (!res.ok) {
					throw new Error(`Fetching Movie failed ${res}`);
				} else {
					console.log('Fetching Movie successful');
					let movie: TmdbMovie = await res.json();
					movies.push(movie);
				}
			} catch (error) {
				console.error('Error filling movies Array! ' + error);
			}
		}
		return movies.map((movie) => ({
			...movie,
			image: `https://image.tmdb.org/t/p/w200${movie.poster_path}`
		}));
	}

	async function fillArray() {
		const movies = await loadNewMovies(20);
		dummyArray = [...dummyArray, ...movies];
		isLoading = false;
		isFetchingMoreMovies = false;
	}

	function handleScroll(event: Event) {
		const element = event.currentTarget as HTMLElement;
		const tolerance = 20;
		const scrollHeight = element.scrollHeight;
		const scrollTop = element.scrollTop;
		const clientHeight = element.clientHeight;

		if (Math.ceil(scrollHeight - scrollTop) <= clientHeight + tolerance && !isFetchingMoreMovies) {
			loadMoreMovies();
		}
	}

	async function loadMoreMovies() {
		isFetchingMoreMovies = true;
		await fillArray();
	}

	onMount(async () => {
		await fillArray();
	});
</script>

<div class="overflow-y-auto h-screen" on:scroll={handleScroll}>
	<div>
		{#if isLoading}
			<div style="display: flex; justify-content: center">
				<CircularProgress style="height: 32px; width: 32px;" indeterminate />
			</div>
			<p class="text-center p-8">Loading...</p>
		{:else}
			<RecommendationList cards={dummyArray} />
			{#if isFetchingMoreMovies}
				<div style="display: flex; justify-content: center">
					<CircularProgress style="height: 32px; width: 32px;" indeterminate />
				</div>
				<p class="text-center p-8">Loading more...</p>
			{/if}
		{/if}
	</div>
</div>
