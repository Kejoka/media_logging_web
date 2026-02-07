<script lang="ts">
	import Book from '$lib/Icons/book.svelte';
	import Tv from '$lib/Icons/tv.svelte';
	import Movie from '$lib/Icons/movie.svelte';
	import Controller from '$lib/Icons/controller.svelte';

	export let tab_index: number;
	export let current_mode: number;
	export let onSwitchMedium: ((detail: { medium: number }) => void) | undefined = undefined;
	export let onFilter: ((detail: { value: string }) => void) | undefined = undefined;

	let searchbar_collapse: HTMLInputElement;
	let searchbar_expanded = false;
	let search_filter = '';
	let input_timeout: ReturnType<typeof setTimeout>;

	function mediaSwitch(medium: number) {
		search_filter = '';
		onSwitchMedium?.({ medium });
	}

	function handleInput() {
		clearTimeout(input_timeout);
		input_timeout = setTimeout(() => {
			onFilter?.({ value: search_filter });
		}, 500);
	}
</script>

<div role="tablist" class="tabs tabs-border bg-base-100 flex-row justify-evenly pb-2">
	<button
		role="tab"
		class="tab {tab_index == 0 ? 'tab-active' : ''}"
		on:click={() => mediaSwitch(0)}
	>
	<div class="flex w-fit flex-row items-center gap-2">
		<Controller></Controller>
		<p>Games</p>
	</div>	
		
	</button>
	<button
		role="tab"
		class="tab {tab_index == 1 ? 'tab-active' : ''}"
		on:click={() => mediaSwitch(1)}
	>
	<div class="flex w-fit flex-row items-center gap-2">
		<Movie></Movie>
		<p>Filme</p>
	</div>	
	</button>
	<button
		role="tab"
		class="tab {tab_index == 2 ? 'tab-active' : ''}"
		on:click={() => mediaSwitch(2)}
	>
				<div class="flex w-fit flex-row items-center gap-2">
					<Tv></Tv>
					<p>Serien</p>
				</div>	
	</button>
	<button
		role="tab"
		class="tab {tab_index == 3 ? 'tab-active' : ''}"
		on:click={() => mediaSwitch(3)}
	>
				<div class="flex w-fit flex-row items-center gap-2">
					<Book></Book>
					<p>Bücher</p>
				</div>	
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
			class="max-h-0 overflow-hidden shadow-lg shadow-base-300 transition-all duration-300 ease-in-out peer-checked:max-h-40"
		>
			<div class="bg-base-100 p-4">
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
						class="-ml-10 mr-5 h-4 w-4 opacity-70"
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
