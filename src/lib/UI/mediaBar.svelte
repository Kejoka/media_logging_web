<script lang="ts">
	import Book from '$lib/Icons/book.svelte';
	import Tv from '$lib/Icons/tv.svelte';
	import Movie from '$lib/Icons/movie.svelte';
	import Controller from '$lib/Icons/controller.svelte';
	import { createEventDispatcher } from 'svelte';
	import NavBar from './navBar.svelte';
	export let header: string;
	export let nav_back_button: boolean;
	export let settings_button: boolean;
	export let tab_index: number;
	export let static_header: boolean;
	export let current_mode: number;
	export let own_profile: boolean;
	const dispatch = createEventDispatcher();
	let searchbar_collapse: HTMLInputElement;
	let searchbar_expanded: boolean = false;
	let search_filter: string;
	let input_timeout = setTimeout(function () {}, 0);

	function mediaSwitch(tab_index: number) {
		tab_index = tab_index;
		search_filter = '';
		dispatch('switch_medium', {
			index: tab_index
		});
	}

	function handleInput() {
		clearTimeout(input_timeout);
		input_timeout = setTimeout(async () => {
			dispatch('filter', search_filter);
		}, 500);
	}
</script>

<div class="z-10 h-fit w-full">
	<NavBar on:switch_mode {static_header} {header} {nav_back_button} {settings_button} {own_profile}
	></NavBar>
	<div>
		<div role="tablist" class="tabs tabs-bordered bg-base-100">
			<button
				role="tab"
				class="tab {tab_index == 0 ? 'tab-active' : ''}"
				on:click={() => mediaSwitch(0)}
			>
				<Controller></Controller>
			</button>
			<button
				role="tab"
				class="tab {tab_index == 1 ? 'tab-active' : ''}"
				on:click={() => mediaSwitch(1)}
			>
				<Movie></Movie>
			</button>
			<button
				role="tab"
				class="tab {tab_index == 2 ? 'tab-active' : ''}"
				on:click={() => mediaSwitch(2)}
			>
				<Tv></Tv>
			</button>
			<button
				role="tab"
				class="tab {tab_index == 3 ? 'tab-active' : ''}"
				on:click={() => mediaSwitch(3)}
			>
				<Book></Book>
			</button>
		</div>
		{#if current_mode != 2}
			<div class="relative w-full">
				<input
					bind:this={searchbar_collapse}
					id="collapse-checkbox"
					type="checkbox"
					class="peer hidden"
				/>
				<div
					class="shadow-base-300 max-h-0 overflow-hidden shadow-lg transition-all duration-300 ease-in-out peer-checked:max-h-40"
				>
					<div class="bg-base-100 rounded-t-lg p-4">
						<label class="mb-3 flex items-center gap-2">
							<input
								type="text"
								class="input input-bordered grow"
								placeholder="Suche"
								bind:value={search_filter}
								on:input={handleInput}
							/>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 16 16"
								fill="currentColor"
								class="mr-5 -ml-10 h-4 w-4 opacity-70"
							>
								<path
									fill-rule="evenodd"
									d="M9.965 11.026a5 5 0 1 1 1.06-1.06l2.755 2.754a.75.75 0 1 1-1.06 1.06l-2.755-2.754ZM10.5 7a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z"
									clip-rule="evenodd"
								/>
							</svg>
						</label>
					</div>
				</div>
				<button
					on:click={() => {
						searchbar_expanded = !searchbar_expanded;
						searchbar_collapse.checked = !searchbar_collapse.checked;
						if (!searchbar_collapse.checked) {
							search_filter = '';
							dispatch('filter', search_filter);
						}
					}}
					class="bg-base-100 shadow-base-300 absolute left-1/2 -mt-2 block h-6 w-12 -translate-x-1/2 transform cursor-pointer rounded-b-full text-white shadow-lg transition-transform focus:outline-none active:scale-95"
				>
					{#if searchbar_expanded}
						<svg
							class="absolute inset-x-0 top-0 mx-auto h-5 w-5 -scale-100"
							fill="none"
							stroke="var(--fallback-nc,oklch(var(--nc)/1))"
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
							stroke="var(--fallback-nc,oklch(var(--nc)/1))"
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
	</div>
</div>
