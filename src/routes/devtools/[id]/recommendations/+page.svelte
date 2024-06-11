<script lang="ts">
	import type { TmdbMovie } from './+page.server';
	import RecommendationList from '$lib/RecommendationList/RecommendationList.svelte';
	import { onMount } from 'svelte';

	let dummyMovie = {
    "adult": false,
    "backdrop_path": "/iZ2816km53S1Qvs0w2nUOL6jpP7.jpg",
    "genre_ids": [28, 12, 878],
    "id": 157350,
    "original_language": "en",
    "original_title": "Divergent",
    "overview": "Das zukünftige Chicago ist in fünf Lager aufgeteilt und in jedem herrscht eine andere Tugend vor: Candor (die Ehrlichen), Abnegation (di…",
    "popularity": 51.007,
    "poster_path": "/6T6U0VU7PViMfgfApgndCl661Il.jpg",
    "release_date": "2014-04-10",
    "title": "Die Bestimmung - Divergent",
    "video": false,
    "vote_averag": 6.917,
    "vote_count": 12533
}

	let dummyArray : Array<TmdbMovie> = [];
	let isLoading = true;

	async function loadNewMovie() {
		const res = await fetch('/api/v1/randomMovie');
		const movie: TmdbMovie = await res.json();
		return movie;
	}

	async function fillArray() {
		for(let i = 0; i < 30; i++) {
			let movie = await loadNewMovie();
			movie.image = `https://image.tmdb.org/t/p/w200${movie.poster_path}`;
			// let movieData = {
			// 	title: movie.title,
			// 	image: `https://image.tmdb.org/t/p/w200${movie.poster_path}`,
			// 	id: movie.id

			// }
			dummyArray.push(movie);
		}
		console.log('Dummy Array:', dummyArray);
		isLoading = false;
	}
	onMount(async () => {
		await fillArray();
	});

</script>

<div>
	<div>
		{#if isLoading}
			<p>Loading...</p>
		{:else}
		<RecommendationList cards={dummyArray} />
		{/if}
	</div>
</div>
