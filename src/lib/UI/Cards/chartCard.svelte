<script lang="ts">
	import { onDestroy, tick } from 'svelte';
	import {
		Chart as ChartJS,
		Tooltip,
		Legend,
		BarController,
		LineController,
		CategoryScale,
		LinearScale,
		BarElement,
		LineElement,
		PointElement,
		Filler,
		type ChartConfiguration
	} from 'chart.js';
	import type { mediaObject } from '$lib/dbUtils';
	import distinctColors from 'distinct-colors';

	ChartJS.register(
		Tooltip,
		Legend,
		BarController,
		LineController,
		CategoryScale,
		LinearScale,
		BarElement,
		LineElement,
		PointElement,
		Filler
	);

	type ChartRow = {
		label: string;
		value: number;
		secondaryValue?: number;
		displayValue?: string;
	};

	export let chart_type: string;
	export let chart_title: string;
	export let media_data: mediaObject[];
	export let current_year = 'Gesamt';

	let canvas: HTMLCanvasElement;
	let chart: ChartJS | null = null;
	let renderedChartType: string | null = null;
	let chartRows: ChartRow[] = [];
	let chartConfig: ChartConfiguration | null = null;

	const monthLabels = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

	function splitValues(value: string | undefined) {
		return (value || '')
			.split(',')
			.map((item) => item.trim())
			.filter(Boolean);
	}

	function getYear(value: string | undefined) {
		if (!value) return null;
		const year = new Date(value).getFullYear();
		return Number.isFinite(year) ? year : null;
	}

	function getColorSet(count: number) {
		return distinctColors({ count: Math.max(count, 1) }).map((color) => color.hex());
	}

	function countBy(values: string[]) {
		const counts = new Map<string, number>();
		for (const value of values) {
			counts.set(value, (counts.get(value) || 0) + 1);
		}
		return [...counts.entries()]
			.map(([label, value]) => ({ label, value }))
			.sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, 'de'))
			.slice(0, 8);
	}

	function averageByGenre() {
		const groups = new Map<string, { total: number; count: number }>();
		for (const medium of media_data) {
			if (!medium.rating) continue;
			for (const genre of splitValues(medium.genres)) {
				const group = groups.get(genre) || { total: 0, count: 0 };
				group.total += medium.rating * 2;
				group.count += 1;
				groups.set(genre, group);
			}
		}
		return [...groups.entries()]
			.filter(([, group]) => group.count > 0)
			.map(([label, group]) => ({
				label,
				value: Number((group.total / group.count).toFixed(1)),
				secondaryValue: group.count,
				displayValue: `${(group.total / group.count).toFixed(1)} / 10 (${group.count})`
			}))
			.sort((a, b) => b.value - a.value || b.secondaryValue! - a.secondaryValue!)
			.slice(0, 8);
	}

	function activityRows() {
		if (current_year !== 'Gesamt' && Number.isFinite(Number(current_year))) {
			const counts = new Array(12).fill(0);
			for (const medium of media_data) {
				if (!medium.added) continue;
				const date = new Date(medium.added);
				if (date.getFullYear() === Number(current_year)) {
					counts[date.getMonth()] += 1;
				}
			}
			return counts.map((value, index) => ({ label: monthLabels[index], value }));
		}

		const years = new Map<string, number>();
		for (const medium of media_data) {
			const year = getYear(medium.added);
			if (year) {
				years.set(String(year), (years.get(String(year)) || 0) + 1);
			}
		}
		return [...years.entries()]
			.sort(([a], [b]) => Number(a) - Number(b))
			.map(([label, value]) => ({ label, value }));
	}

	function ratingDifferenceRows() {
		return media_data
			.filter((medium) => medium.rating && medium.averagerating && !Number.isNaN(medium.averagerating))
			.map((medium) => ({
				label: medium.title || 'Ohne Titel',
				value: Number((medium.rating! * 2 - medium.averagerating!).toFixed(1)),
				displayValue: `${medium.rating! * 2 >= medium.averagerating! ? '+' : ''}${(medium.rating! * 2 - medium.averagerating!).toFixed(1)}`
			}))
			.sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
			.slice(0, 8);
	}

	function decadeRows() {
		return countBy(
			media_data
				.map((medium) => getYear(medium.release))
				.filter((year): year is number => year !== null)
				.map((year) => `${Math.floor(year / 10) * 10}er`)
		);
	}

	function releaseAgeRows() {
		const buckets = new Map([
			['Release-Jahr', 0],
			['1-5 Jahre alt', 0],
			['6-15 Jahre alt', 0],
			['16+ Jahre alt', 0]
		]);
		for (const medium of media_data) {
			const addedYear = getYear(medium.added);
			const releaseYear = getYear(medium.release);
			if (!addedYear || !releaseYear) continue;
			const age = Math.max(addedYear - releaseYear, 0);
			const label =
				age === 0 ? 'Release-Jahr' : age <= 5 ? '1-5 Jahre alt' : age <= 15 ? '6-15 Jahre alt' : '16+ Jahre alt';
			buckets.set(label, (buckets.get(label) || 0) + 1);
		}
		return [...buckets.entries()].map(([label, value]) => ({ label, value }));
	}

	function showLoggedSeasonRows() {
		const groups = new Map<string, { title: string; count: number }>();
		for (const medium of media_data) {
			const key = medium.tmdbid ? String(medium.tmdbid) : medium.title?.trim().toLowerCase();
			if (!key || !medium.seasons) continue;
			const group = groups.get(key) || { title: medium.title || 'Ohne Titel', count: 0 };
			group.count += 1;
			groups.set(key, group);
		}
		return [...groups.values()]
			.map((group) => ({ label: group.title, value: group.count }))
			.sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, 'de'))
			.slice(0, 8);
	}

	function pageRows() {
		const buckets = new Map([
			['< 250', 0],
			['250-399', 0],
			['400-599', 0],
			['600+', 0]
		]);
		for (const medium of media_data) {
			const pages = Number(medium.pagecount || 0);
			if (!pages) continue;
			const label = pages < 250 ? '< 250' : pages < 400 ? '250-399' : pages < 600 ? '400-599' : '600+';
			buckets.set(label, (buckets.get(label) || 0) + 1);
		}
		return [...buckets.entries()].map(([label, value]) => ({ label, value }));
	}

	function pagesOverTimeRows() {
		const groups = new Map<string, number>();
		for (const medium of media_data) {
			if (!medium.added || !medium.pagecount) continue;
			const date = new Date(medium.added);
			const label =
				current_year !== 'Gesamt' && Number.isFinite(Number(current_year))
					? monthLabels[date.getMonth()]
					: String(date.getFullYear());
			groups.set(label, (groups.get(label) || 0) + Number(medium.pagecount));
		}
		if (current_year !== 'Gesamt' && Number.isFinite(Number(current_year))) {
			return monthLabels.map((label) => ({ label, value: groups.get(label) || 0 }));
		}
		return [...groups.entries()]
			.sort(([a], [b]) => Number(a) - Number(b))
			.map(([label, value]) => ({ label, value }));
	}

	function genrePageRows() {
		const groups = new Map<string, number>();
		for (const medium of media_data) {
			const pages = Number(medium.pagecount || 0);
			if (!pages) continue;
			for (const genre of splitValues(medium.genres)) {
				groups.set(genre, (groups.get(genre) || 0) + pages);
			}
		}
		return [...groups.entries()]
			.map(([label, value]) => ({ label, value }))
			.sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, 'de'))
			.slice(0, 8);
	}

	function ratingBarRows(source: 'user' | 'web') {
		const counts = new Array(10).fill(0);
		for (const medium of media_data) {
			const rawValue = source === 'user' ? (medium.rating || 0) * 2 : medium.averagerating || 0;
			if (!rawValue) continue;
			const index = Math.max(1, Math.min(10, Math.round(rawValue))) - 1;
			counts[index] += 1;
		}
		return counts.map((value, index) => ({ label: `${index + 1}/10`, value }));
	}

	function rowsForType() {
		switch (chart_type) {
			case 'genre_pie':
			case 'genre_bar':
				return countBy(media_data.flatMap((medium) => splitValues(medium.genres)));
			case 'rating_bar_user':
				return ratingBarRows('user');
			case 'rating_bar_web':
				return ratingBarRows('web');
			case 'activity_timeline':
				return activityRows();
			case 'rating_difference':
				return ratingDifferenceRows();
			case 'platform_distribution':
				return countBy(media_data.flatMap((medium) => splitValues(medium.platforms)));
			case 'release_decades':
				return decadeRows();
			case 'genre_rating':
				return averageByGenre();
			case 'release_age':
				return releaseAgeRows();
			case 'show_logged_seasons':
				return showLoggedSeasonRows();
			case 'top_authors':
				return countBy(media_data.flatMap((medium) => splitValues(medium.author)));
			case 'pages_over_time':
				return pagesOverTimeRows();
			case 'page_distribution':
				return pageRows();
			case 'genre_pages':
				return genrePageRows();
			default:
				return [];
		}
	}

	function buildConfig(rows: ChartRow[]): ChartConfiguration {
		const colors = getColorSet(rows.length);
		const isLine = chart_type === 'activity_timeline' || chart_type === 'pages_over_time';
		return {
			type: isLine ? 'line' : 'bar',
			data: {
				labels: rows.map((row) => row.label),
				datasets: [
					{
						label: chart_title,
						data: rows.map((row) => row.value),
						backgroundColor: isLine ? 'rgba(125, 211, 252, 0.2)' : colors,
						borderColor: isLine ? 'rgb(125, 211, 252)' : colors,
						borderWidth: 2,
						tension: 0.3,
						fill: isLine
					}
				]
			},
			options: {
				indexAxis: isLine ? 'x' : 'y',
				responsive: true,
				maintainAspectRatio: false,
				animation: false,
				plugins: {
					legend: { display: false },
					tooltip: {
						callbacks: {
							label: (context) => `${context.parsed.x ?? context.parsed.y}`
						}
					}
				},
				scales: {
					x: {
						beginAtZero: true,
						ticks: { precision: 0 }
					},
					y: {
						ticks: {
							autoSkip: false,
							font: { size: 11 }
						}
					}
				}
			}
		};
	}

	function destroyChart() {
		if (chart) {
			chart.destroy();
			chart = null;
			renderedChartType = null;
		}
	}

	function renderChart() {
		if (!canvas || !chartConfig) {
			destroyChart();
			return;
		}

		try {
			const nextChartType = (chartConfig as ChartConfiguration).type;
			if (!chart || renderedChartType !== nextChartType) {
				destroyChart();
				chart = new ChartJS(canvas, chartConfig);
				renderedChartType = nextChartType;
				return;
			}

			chart.data.labels = chartConfig.data?.labels || [];
			chart.data.datasets = chartConfig.data?.datasets || [];
			chart.options = chartConfig.options || {};
			chart.update('none');
		} catch (error) {
			console.error('Failed to render stats chart', error);
			destroyChart();
		}
	}

	$: chartRows = rowsForType().filter((row) => row.value !== 0);
	$: chartConfig = chartRows.length ? buildConfig(chartRows) : null;
	$: if (canvas && chartConfig) {
		void tick().then(renderChart);
	}
	$: if (!chartConfig) {
		destroyChart();
	}

	onDestroy(destroyChart);
</script>

{#if chartConfig && chartRows.length}
	<div class="px-2 pb-2">
		<div class="rounded-lg bg-base-100 p-4">
			<h2 class="mb-3 text-base font-semibold">{chart_title}</h2>
			<div class="h-64 min-h-64 w-full">
				<canvas bind:this={canvas} aria-label={chart_title}></canvas>
			</div>
		</div>
	</div>
{/if}
