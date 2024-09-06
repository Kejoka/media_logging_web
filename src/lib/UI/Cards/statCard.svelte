<script lang="ts">
	import type { mediaObject } from '$lib/dbUtils';
	import Analytics from '$lib/Icons/analytics.svelte';
	import CalendarCheck from '$lib/Icons/calendar_check.svelte';
	import Category from '$lib/Icons/category.svelte';
	import Difference from '$lib/Icons/difference.svelte';
	import DoubleStar from '$lib/Icons/double_star.svelte';
	import Pages from '$lib/Icons/pages.svelte';
	import Person from '$lib/Icons/person.svelte';
	import Star from '$lib/Icons/star.svelte';
	import Trophy from '$lib/Icons/trophy.svelte';
	export let media_data: mediaObject[];
	export let stat_type: string;
	export let stat_title: string;
	export let stat_desc: string;
	let stat_value: string;
	let stat_exists: boolean = false;
	if (stat_type === 'added_in_release_year') {
		const filtered_media_data_length = media_data.filter(
			(medium) => medium.added?.substring(0, 4) === medium.release?.substring(0, 4)
		).length;
		stat_value = ((filtered_media_data_length / media_data.length) * 100).toFixed(1) + '%';
		stat_exists = true;
	} else if (stat_type === 'average_rating_user') {
		stat_value =
			(
				media_data.reduce((x, y) => x + (y.rating ? y.rating * 2 : 0), 0) /
				media_data.filter((medium) => medium.rating && medium.rating != 0).length
			).toFixed(1) + ' / 10';
		if (
			!isNaN(
				media_data.reduce((x, y) => x + (y.rating ? y.rating * 2 : 0), 0) /
					media_data.filter((medium) => medium.rating && medium.rating != 0).length
			)
		) {
			stat_exists = true;
		}
	} else if (stat_type === 'average_rating_web') {
		stat_value =
			(
				media_data.reduce(
					(x, y) => x + (y.averagerating && !isNaN(y.averagerating) ? y.averagerating : 0),
					0
				) /
				media_data.filter(
					(medium) =>
						medium.averagerating && !isNaN(medium.averagerating) && medium.averagerating != 0
				).length
			).toFixed(1) + ' / 10';
		if (
			!isNaN(
				media_data.reduce(
					(x, y) => x + (y.averagerating && !isNaN(y.averagerating) ? y.averagerating : 0),
					0
				) /
					media_data.filter(
						(medium) =>
							medium.averagerating && !isNaN(medium.averagerating) && medium.averagerating != 0
					).length
			)
		) {
			stat_exists = true;
		}
	} else if (stat_type === 'trophy_rate') {
		stat_value =
			media_data.filter((medium) => medium.trophy && medium.trophy == 1).length +
			' (' +
			(
				(media_data.filter((medium) => medium.trophy && medium.trophy == 1).length /
					media_data.length) *
				100
			).toFixed(2) +
			'%)';
		stat_exists = true;
	} else if (stat_type === 'page_count') {
		stat_value = String(
			media_data.reduce((x, y) => x + (y.pagecount ? Number(y.pagecount) : 0), 0)
		);
		stat_exists = true;
	} else if (stat_type === 'author_count') {
		stat_value = String(
			media_data
				.flatMap((medium) => medium.author?.split(','))
				.map((author) => author?.trim())
				.filter((author, index, self) => index == self.indexOf(author)).length
		);
		stat_exists = true;
	} else if (stat_type === 'rating_difference') {
		const diff_list = media_data
			.map((medium) =>
				medium.rating && medium.rating != 0 && medium.averagerating && !isNaN(medium.averagerating)
					? medium.rating * 2 - medium.averagerating
					: NaN
			)
			.filter((diff) => !isNaN(diff));
		if (diff_list.length != 0) {
			stat_value = String(
				Math.abs(diff_list.reduce((x, y) => x + y) / diff_list.length).toFixed(2)
			);
			if (diff_list.reduce((x, y) => x + y) < 0) {
				stat_value += ' weniger';
			} else if (diff_list.reduce((x, y) => x + y) > 0) {
				stat_value += ' mehr';
			} else {
				stat_value = 'Kein Unterschied';
			}
			stat_exists = true;
		}
	}
</script>

{#if stat_exists}
	<div class="flex mb-2">
		<div class="stats shadow w-full mx-2">
			<div class="stat">
				<div class="stat-figure text-secondary">
					{#if stat_type === 'page_count'}
						<Pages></Pages>
					{:else if stat_type === 'author_count'}
						<Person></Person>
					{:else if stat_type === 'added_in_release_year'}
						<CalendarCheck></CalendarCheck>
					{:else if stat_type === 'genre_ranking'}
						<Category></Category>
					{:else if stat_type === 'average_rating_user'}
						<Star></Star>
					{:else if stat_type === 'average_rating_web'}
						<DoubleStar></DoubleStar>
					{:else if stat_type === 'trophy_rate'}
						<Trophy styling={'inline-block h-8 w-8 stroke-current'}></Trophy>
					{:else if stat_type === 'rating_difference'}
						<Difference></Difference>
					{:else}
						<Analytics></Analytics>
					{/if}
				</div>
				<div class="stat-title">{stat_title}</div>
				<div class="stat-value">{stat_value}</div>
				<div class="stat-desc line-clamp-1">{stat_desc}</div>
			</div>
		</div>
	</div>
{/if}
