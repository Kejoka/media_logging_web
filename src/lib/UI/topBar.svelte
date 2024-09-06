<script lang="ts">
	import Book from '$lib/Icons/book.svelte';
	import Tv from '$lib/Icons/tv.svelte';
	import Movie from '$lib/Icons/movie.svelte';
	import Controller from '$lib/Icons/controller.svelte';
	import { createEventDispatcher } from 'svelte';
	import NavBar from './navBar.svelte';
	import { tap } from 'svelte-gestures';
	export let header: string;
	export let navBackButton: boolean;
	export let settingsButton: boolean;
	export let tabIndex: number;
	export let staticHeader: boolean;
	export let current_mode: number;
	export let own_profile: boolean;
	const dispatch = createEventDispatcher();
	let searchbar_collapse: HTMLInputElement;
	let searchbar_expanded: boolean = false;
	let search_filter: string;
	let input_timeout = setTimeout(function () {}, 0);

	function mediaSwitch(tab_index: number) {
		tabIndex = tab_index;
		search_filter = '';
		dispatch('switchMedium', {
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

<div class="z-10 w-full h-fit">
	<NavBar on:switchMode {staticHeader} {header} {navBackButton} {settingsButton} {own_profile}
	></NavBar>
	<div>
		<div role="tablist" class="tabs tabs-bordered bg-base-100">
			<button
				role="tab"
				class="tab {tabIndex == 0 ? 'tab-active' : ''}"
				on:click={() => mediaSwitch(0)}
			>
				<Controller></Controller>
			</button>
			<button
				role="tab"
				class="tab {tabIndex == 1 ? 'tab-active' : ''}"
				on:click={() => mediaSwitch(1)}
			>
				<Movie></Movie>
			</button>
			<button
				role="tab"
				class="tab {tabIndex == 2 ? 'tab-active' : ''}"
				on:click={() => mediaSwitch(2)}
			>
				<Tv></Tv>
			</button>
			<button
				role="tab"
				class="tab {tabIndex == 3 ? 'tab-active' : ''}"
				on:click={() => mediaSwitch(3)}
			>
				<Book></Book>
			</button>
		</div>
		{#if current_mode != 2}
			<div class="w-full relative">
				<input
					bind:this={searchbar_collapse}
					id="collapse-checkbox"
					type="checkbox"
					class="peer hidden"
				/>
				<div
					class="overflow-hidden transition-all duration-300 ease-in-out max-h-0 peer-checked:max-h-40 shadow-lg shadow-base-300"
				>
					<div class="bg-base-100 p-4 rounded-t-lg">
						<label class="input input-bordered flex items-center gap-2 mb-3">
							<input
								type="text"
								class="grow"
								placeholder="Suche"
								bind:value={search_filter}
								on:input={handleInput}
							/>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 16 16"
								fill="currentColor"
								class="h-4 w-4 opacity-70"
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
					use:tap
					on:tap={() => {
						searchbar_expanded = !searchbar_expanded;
						searchbar_collapse.checked = !searchbar_collapse.checked;
						if (!searchbar_collapse.checked) {
							search_filter = '';
							dispatch('filter', search_filter);
						}
					}}
					class="block absolute -mt-2 left-1/2 transform -translate-x-1/2 bg-base-100 text-white w-12 h-6 rounded-b-full transition-transform active:scale-95 focus:outline-none shadow-lg shadow-base-300 cursor-pointer"
				>
					{#if searchbar_expanded}
						<svg
							class="w-5 h-5 absolute inset-x-0 top-0 mx-auto -scale-100"
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
							class="w-5 h-5 absolute inset-x-0 top-0 mx-auto"
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
