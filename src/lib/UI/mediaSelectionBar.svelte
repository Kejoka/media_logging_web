<script lang="ts">
	import Book from '$lib/Icons/book.svelte';
	import Tv from '$lib/Icons/tv.svelte';
	import Movie from '$lib/Icons/movie.svelte';
	import Controller from '$lib/Icons/controller.svelte';
	import Sort from '$lib/Icons/sort.svelte';
	import type { SortingMethod } from '$lib/types';
	import { type MediaType } from '$lib/utils';

	export let current_medium: MediaType;
	export let active_media_types: MediaType[];
	export let current_mode: number;
	export let onSwitchMedium: ((detail: { medium: MediaType }) => void) | undefined = undefined;
	export let onFilter: ((detail: { value: string }) => void) | undefined = undefined;
	export let onSortChange: ((detail: { method: SortingMethod }) => void) | undefined = undefined;
	export let sorting_method: SortingMethod = 'date_added_desc';

	let searchbar_collapse: HTMLInputElement;
	let sort_dropdown: HTMLDivElement;
	let sort_button: HTMLButtonElement;
	let sort_open = false;
	let searchbar_expanded = false;
	let search_filter = '';
	let input_timeout: ReturnType<typeof setTimeout>;
	let dropdown_top = 0;
	let dropdown_right = 0;

	const RATING_SORTS: SortingMethod[] = ['review_score_desc', 'review_score_asc'];

	function mediaSwitch(medium: MediaType) {
		search_filter = '';
		onSwitchMedium?.({ medium });
	}

	function handleInput() {
		clearTimeout(input_timeout);
		input_timeout = setTimeout(() => {
			onFilter?.({ value: search_filter });
		}, 500);
	}

	function handleSortChange(method: SortingMethod) {
		onSortChange?.({ method });
		sort_open = false;
	}

	function toggleSortDropdown() {
		sort_open = !sort_open;
		if (sort_open && sort_button) {
			const rect = sort_button.getBoundingClientRect();
			dropdown_top = rect.bottom + 8; // 8px below the button
			dropdown_right = window.innerWidth - rect.right;
		}
	}

	// If in backlog mode and current sort is rating, switch to date_added_desc
	$: if (current_mode === 1 && RATING_SORTS.includes(sorting_method)) {
		handleSortChange('date_added_desc');
	}

	// Close dropdown when clicking outside
	function handleClickOutside(e: Event) {
		if (
			sort_dropdown &&
			!sort_dropdown.contains(e.target as Node) &&
			sort_button &&
			!sort_button.contains(e.target as Node)
		) {
			sort_open = false;
		}
	}
</script>

<svelte:window on:click={handleClickOutside} />

<div role="tablist" class="tabs-border tabs flex-row justify-evenly bg-base-100 pt-1 pb-2 shadow-lg shadow-base-300">
	{#each active_media_types as media_type}
		<button
			role="tab"
			class="tab {current_medium === media_type ? 'tab-active' : ''}"
			onclick={() => mediaSwitch(media_type)}
		>
			<div class="flex w-fit flex-row items-center gap-2">
				{#if media_type === 'games'}
					<Controller></Controller>
					<p>Games</p>
				{:else if media_type === 'movies'}
					<Movie></Movie>
					<p>Filme</p>
				{:else if media_type === 'shows'}
					<Tv></Tv>
					<p>Serien</p>
				{:else if media_type === 'books'}
					<Book></Book>
					<p>Bücher</p>
				{/if}
			</div>
		</button>
	{/each}
</div>
{#if current_mode != 2}
	<div class="sticky w-full rounded-b-lg">
		<input
			bind:this={searchbar_collapse}
			id="collapse-checkbox"
			type="checkbox"
			class="peer hidden"
		/>
		<div
			class="max-h-0 overflow-hidden shadow-lg shadow-base-300 transition-all duration-300 ease-in-out peer-checked:max-h-40"
		>
			<div class="bg-base-100 p-4">
				<div class="mb-3 flex items-center gap-2">
					<label class="relative grow">
						<input
							type="text"
							class="ml-input"
							placeholder="Suche"
							bind:value={search_filter}
							oninput={handleInput}
						/>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 16 16"
							fill="currentColor"
							class="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 opacity-70"
						>
							<path
								fill-rule="evenodd"
								d="M9.965 11.026a5 5 0 1 1 1.06-1.06l2.755 2.754a.75.75 0 1 1-1.06 1.06l-2.755-2.754ZM10.5 7a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z"
								clip-rule="evenodd"
							/>
						</svg>
					</label>
					<button
						bind:this={sort_button}
						class="btn h-10 w-10 p-0 btn-ghost btn-sm"
						title="Sortierung"
						onclick={toggleSortDropdown}
					>
						<div class="h-6 w-6">
							<Sort />
						</div>
					</button>
				</div>
			</div>
		</div>
		{#if sort_open}
			<div
				bind:this={sort_dropdown}
				style={`position: fixed; top: ${dropdown_top}px; right: ${dropdown_right}px;`}
				class="z-50 w-64 rounded-lg border border-base-300 bg-base-100 shadow-lg"
			>
				<div class="p-2">
					<p class="px-2 py-1 text-xs font-semibold opacity-70">Sortierung</p>
					<button
						class="block w-full rounded px-3 py-2 text-left text-sm hover:bg-base-200 {sorting_method ===
						'date_added_desc'
							? 'bg-base-200 font-semibold'
							: ''}"
						onclick={() => handleSortChange('date_added_desc')}
					>
						Hinzugefügt: Neu zuerst
					</button>
					<button
						class="block w-full rounded px-3 py-2 text-left text-sm hover:bg-base-200 {sorting_method ===
						'date_added_asc'
							? 'bg-base-200 font-semibold'
							: ''}"
						onclick={() => handleSortChange('date_added_asc')}
					>
						Hinzugefügt: Alt zuerst
					</button>
					<button
						class="block w-full rounded px-3 py-2 text-left text-sm hover:bg-base-200 {sorting_method ===
						'release_date_desc'
							? 'bg-base-200 font-semibold'
							: ''}"
						onclick={() => handleSortChange('release_date_desc')}
					>
						Release: Neu zuerst
					</button>
					<button
						class="block w-full rounded px-3 py-2 text-left text-sm hover:bg-base-200 {sorting_method ===
						'release_date_asc'
							? 'bg-base-200 font-semibold'
							: ''}"
						onclick={() => handleSortChange('release_date_asc')}
					>
						Release: Alt zuerst
					</button>
					{#if current_mode !== 1}
						<button
							class="block w-full rounded px-3 py-2 text-left text-sm hover:bg-base-200 {sorting_method ===
							'review_score_desc'
								? 'bg-base-200 font-semibold'
								: ''}"
							onclick={() => handleSortChange('review_score_desc')}
						>
							Bewertung: Hoch zuerst
						</button>
						<button
							class="block w-full rounded px-3 py-2 text-left text-sm hover:bg-base-200 {sorting_method ===
							'review_score_asc'
								? 'bg-base-200 font-semibold'
								: ''}"
							onclick={() => handleSortChange('review_score_asc')}
						>
							Bewertung: Niedrig zuerst
						</button>
					{/if}
					<button
						class="block w-full rounded px-3 py-2 text-left text-sm hover:bg-base-200 {sorting_method ===
						'title_asc'
							? 'bg-base-200 font-semibold'
							: ''}"
						onclick={() => handleSortChange('title_asc')}
					>
						Titel: A-Z
					</button>
					<button
						class="block w-full rounded px-3 py-2 text-left text-sm hover:bg-base-200 {sorting_method ===
						'title_desc'
							? 'bg-base-200 font-semibold'
							: ''}"
						onclick={() => handleSortChange('title_desc')}
					>
						Titel: Z-A
					</button>
				</div>
			</div>
		{/if}
		<button
			onclick={() => {
				searchbar_expanded = !searchbar_expanded;
				searchbar_collapse.checked = !searchbar_collapse.checked;
				if (!searchbar_collapse.checked) {
					search_filter = '';
					onFilter?.({ value: search_filter });
				}
			}}
			class="absolute left-1/2 -mt-2 block h-6 w-12 -translate-x-1/2 transform cursor-pointer rounded-b-full bg-base-100 text-white shadow-lg shadow-base-300 transition-transform focus:outline-none active:scale-95"
		>
			{#if searchbar_expanded}
				<svg
					class="absolute inset-x-0 top-0 mx-auto h-5 w-5 -scale-100"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					viewBox="0 0 24 24"
					xmlns="http://www.w3.org/2000/svg"
				>
					<path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"></path>
				</svg>
			{:else}
				<svg
					class="absolute inset-x-0 top-0 mx-auto h-5 w-5"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					viewBox="0 0 24 24"
					xmlns="http://www.w3.org/2000/svg"
				>
					<path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"></path>
				</svg>
			{/if}
		</button>
	</div>
{/if}
