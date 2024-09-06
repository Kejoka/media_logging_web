<script lang="ts">
	import { Pie, Bar } from 'svelte-chartjs';
	import {
		Chart as ChartJS,
		Title,
		Tooltip,
		Legend,
		ArcElement,
		CategoryScale,
		LinearScale,
		BarElement
	} from 'chart.js';
	import type { mediaObject } from '$lib/dbUtils';
	import distinctColors from 'distinct-colors';

	export let chart_type: string;
	export let chart_title: string;
	export let media_data: mediaObject[];
	let data: any;
	let chart_exists: boolean = false;

	function generateColorSet(count: number) {
		const colors = distinctColors({ count });
		const color_set: [string, string][] = [];
		for (let color of colors) {
			color_set.push([color.hex(), color.brighten().hex()]);
		}
		return color_set;
	}

	if (chart_type === 'genre_pie') {
		ChartJS.register(Title, Tooltip, Legend, ArcElement, CategoryScale);
		const genres = media_data
			.flatMap((medium) => medium.genres?.split(','))
			.map((genre) => (genre ? genre.trim() : ''));
		if (genres.length != 0) {
			chart_exists = true;
		}
		const unique_genres = genres.filter((genre, index, self) => index == self.indexOf(genre));
		const genre_data: { [id: string]: number } = {};
		for (let unique_genre of unique_genres) {
			genres.forEach((genre) => {
				if (genre === unique_genre) {
					if (genre_data[unique_genre]) {
						genre_data[unique_genre]++;
					} else {
						genre_data[unique_genre] = 1;
					}
				}
			});
		}
		const sorted_genre_data = Object.entries(genre_data).sort((x, y) => {
			if (y[1] === y[1]) {
				return x[0].localeCompare(y[0]);
			}
			return y[1] - x[1];
		});
		const colors = generateColorSet(sorted_genre_data.length);
		data = {
			labels: sorted_genre_data.map((data) => data[0]),
			datasets: [
				{
					data: sorted_genre_data.map((data) => data[1]),
					backgroundColor: colors.map((color) => color[0]),
					hoverBackgroundColor: colors.map((color) => color[1])
				}
			]
		};
	} else if (chart_type === 'rating_bar_user') {
		ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale);
		const ratings = media_data.flatMap((medium) => (medium.rating ? medium.rating * 2 : 0));
		if (ratings.filter((rating) => rating != 0).length != 0) {
			chart_exists = true;
		}
		const rating_data: number[] = new Array(11).fill(0);
		for (let rating of ratings) {
			rating_data[rating]++;
		}
		rating_data.shift();
		const colors = generateColorSet(rating_data.length);
		data = {
			labels: rating_data.map((rating, index) => String(index + 1) + '/10'),
			datasets: [
				{
					label: ' Bewertungen: ',
					data: rating_data,
					backgroundColor: colors.map((color) => color[0]),
					borderWidth: 2,
					borderColor: colors.map((color) => color[1])
				}
			]
		};
	} else if (chart_type === 'rating_bar_web') {
		ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale);
		const ratings = media_data.flatMap((medium) =>
			medium.averagerating ? medium.averagerating : 0
		);
		if (ratings.filter((rating) => rating != 0).length != 0) {
			chart_exists = true;
		}
		const rating_data: number[] = new Array(11).fill(0);
		for (let rating of ratings) {
			rating_data[Math.round(rating)]++;
		}
		rating_data.shift();
		const colors = generateColorSet(rating_data.length);
		data = {
			labels: rating_data.map((rating, index) => String(index + 1) + '/10'),
			datasets: [
				{
					label: ' Bewertungen: ',
					data: rating_data,
					backgroundColor: colors.map((color) => color[0]),
					borderWidth: 2,
					borderColor: colors.map((color) => color[1])
				}
			]
		};
	}
</script>

{#if chart_exists}
	<div class="px-2 pb-2">
		<div class="card bg-base-100">
			<h2 class="card-title justify-center mt-2">{chart_title}</h2>
			{#if chart_type === 'genre_pie'}
				<Pie
					class="mb-2 h-fit max-h-fit min-h-fit flex flex-col m-auto justify-center align-middle"
					{data}
					options={{ responsive: true }}
				></Pie>
			{:else if chart_type === 'rating_bar_user' || chart_type === 'rating_bar_web'}
				<Bar
					class="mb-2 h-fit max-h-[20vh] w-full flex flex-col m-auto justify-center align-middle"
					{data}
					options={{ responsive: true }}
				/>
			{/if}
		</div>
	</div>
{/if}
