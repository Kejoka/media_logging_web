<script lang="ts">
	import type { TmdbMovie } from './+page.server';
	import RecommendationList from '$lib/RecommendationList/RecommendationList.svelte';
	import { onMount } from 'svelte';
	import type { PageServerData } from './$types';
	import NavBar from '$lib/UI/navBar.svelte';
	export let data: PageServerData;

	let recommendations: Array<TmdbMovie> = [];
	let isLoading = true;
	let isFetchingMoreMovies = false;
	let currentPage = 1;

	async function loadNewMovies() {
		let movies: Array<TmdbMovie> = [];
		try {
			// Send current rec ids so they can be filtered out server site
			const movieIds = recommendations.map((m) => m['id']);
			let res = await fetch(
				`/api/v1/getRecommendations?user_pref_id=${data.data?.id}&page=${currentPage}`,
				{
					method: 'POST',
					body: JSON.stringify({ movieIds }),
					headers: {
						'Content-Type': 'application/json'
					}
				}
			);
			if (!res.ok) {
				throw new Error(`Fetching Movie failed ${res}`);
			} else {
				console.log('Fetching Movie successful');
				let movie_recs: TmdbMovie[] = await res.json();
				movies = [...movies, ...movie_recs];
				// console.log(movies);
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
		const movies = await loadNewMovies();
		//remove duplicates
		const loadedRecommendations = [...recommendations, ...movies];
		recommendations = loadedRecommendations.filter(
			(obj, index, self) => index === self.findIndex((t) => t.id === obj.id)
		);
		isLoading = false;
		isFetchingMoreMovies = false;
		currentPage += 1;
	}

	function handleScroll(event: Event) {
		console.log('WHHOSH');
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

<svelte:head>
	<title>Movie Recommendations</title>
</svelte:head>

<div>
	<NavBar header={'Empfehlungen'} settingsButton={false} navBackButton={true}></NavBar>
	<div class="overflow-y-auto w-[90%] items-center m-auto mt-3" on:scroll={(e) => handleScroll(e)}>
		{#if isLoading}
			<div class="flex justify-center">
				<span class="loading loading-spinner"></span>
			</div>
		{:else if recommendations.length < 20}
			<div class="flex flex-col text-center">
				<p class="text-3xl">Sorry, No recommendations yet 😓</p>
				<p class="text-lg mt-5">Use MovieSwiper to train your recommender for a while!</p>
			</div>
		{:else}
			<RecommendationList cards={recommendations} />
			{#if isFetchingMoreMovies}
				<div class="w-full h-full mt-5 relative">
					<span class="loading loading-spinner"></span>
				</div>
			{/if}
		{/if}
	</div>
</div>
