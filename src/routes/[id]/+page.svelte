<script lang="ts">
	import TopBar from '$lib/UI/topBar.svelte';
	import YearBar from '$lib/UI/yearBar.svelte';
	import { getYears, indexToMedium } from '$lib/dbUtils.ts';
	import { supabase } from '$lib/supabaseClient.js';
	import StarRating from '$lib/UI/Stars_modified/Stars.svelte';
	export let data;
	let { session, profile, movies } = data;
	$: ({ session, profile, movies } = data);

	let current_medium = 'movies';
	let current_year = new Date().getFullYear();
	let year_media_data: {}[] = movies.data ? movies.data : [];
	let years_in_db = getYears(year_media_data);
	let media_data = year_media_data.filter((obj) => obj.addedin == current_year);

	function range(size: number) {
		return [...Array(size).keys()];
	}

	function getRatingConfig(score: number) {
		return {
			readOnly: false,
			countStars: 5,
			range: {
				min: 0,
				max: 5,
				step: 0.5
			},
			score: score,
			showScore: false,
			starConfig: {
				size: 17,
				fillColor: '#00FFDC',
				strokeColor: '#BB8511',
				unfilledColor: '#143F39',
				strokeUnfilledColor: '#000'
			}
		};
	}

	async function handleSwitch(event: any) {
		let medium = indexToMedium(event.detail.index);
		const new_data = await supabase
			.from(medium)
			.select()
			.eq('user_id', session.user.id)
			.eq('backlogged', 0)
			.eq('addedin', current_year);
		media_data = new_data.data ? new_data.data : [];
		current_medium = medium;
	}

	async function handleYearSwitch(event: any) {
		const year = event.detail.year.year;
		console.log(year);
		const new_data = await supabase
			.from(current_medium)
			.select()
			.eq('user_id', session.user.id)
			.eq('backlogged', 0)
			.eq('addedin', year);
		media_data = new_data.data ? new_data.data : [];
		current_year = year;
	}
</script>

<div class="flex flex-col">
	<TopBar on:switch={handleSwitch}></TopBar>
	<!-- <button on:click={() => DEBUG_csvToSupabase(session.user.id)}> DEBUG</button> -->
	<div class="bg-neutral overflow-auto max-h-[85vh]">
		{#each media_data as medium}
			{@const config = getRatingConfig(medium.rating)}
			<div class="card card-side bg-base-300 m-5 max-h-36">
				<figure class=" w-28 min-h-full">
					<img src={medium.image} alt={medium.title} />
				</figure>
				<div class="card-body flex-row items-center py-5">
					<div>
						<h2 class="card-title">{medium.title}</h2>
						<p>{medium.genres}</p>
						<p>Erschienen: {new Date(medium.release).toLocaleDateString('de-DE')}</p>
						<p>Durchschnittliche Bewertung: {medium.averagerating}</p>
					</div>
					<div class="ml-auto">
						<StarRating {config}></StarRating>
					</div>
				</div>
			</div>
		{/each}
	</div>
	<YearBar on:switch={handleYearSwitch} years={years_in_db}></YearBar>
</div>
