<script lang="ts">
	import type { TmdbMovie } from './+page.server';
	import RecommendationList from '$lib/RecommendationList/RecommendationList.svelte';
	import { onMount } from 'svelte';
	import CircularProgress from '@smui/circular-progress';
	import type { PageServerData } from './$types';
	export let data: PageServerData;

	let amountToLoad = 20;
	let recommendations: Array<TmdbMovie> = [];
	let isLoading = true;
	let isFetchingMoreMovies = false;
	let currentPage = 1;

	async function loadNewMovies(amount: number) {
		let movies: Array<TmdbMovie> = [];
		try {
			let res = await fetch(`/api/v1/getReco?user_pref_id=${data.data?.id}&page=${currentPage}`);
			if (!res.ok) {
				throw new Error(`Fetching Movie failed ${res}`);
			} else {
				console.log('Fetching Movie successful');
				let movie_recs: TmdbMovie[] = await res.json();
				movies = [...movies, ...movie_recs];
				console.log(movies);
			}
		} catch (error) {
			console.error('Error filling movies Array! ' + error);
		}
		return movies.map((movie) => ({
			...movie,
			image: `https://image.tmdb.org/t/p/w200${movie.poster_path}`
		}));
	}

	async function fillArray() {
		const movies = await loadNewMovies(20);
		//remove duplicates
		const loadedReccommendations = [...recommendations, ...movies];
		recommendations = loadedReccommendations.filter(
			(obj, index, self) => index === self.findIndex((t) => t.id === obj.id)
		);
		console.log(recommendations);
		isLoading = false;
		isFetchingMoreMovies = false;
		currentPage += 1;
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
			<RecommendationList cards={recommendations} />
			{#if isFetchingMoreMovies}
				<div style="display: flex; justify-content: center">
					<CircularProgress style="height: 32px; width: 32px;" indeterminate />
				</div>
				<p class="text-center p-8">Loading more...</p>
			{/if}
		{/if}
	</div>
</div>
