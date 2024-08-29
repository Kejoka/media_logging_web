<script lang="ts">
	import Book from '$lib/Icons/book.svelte';
	import Tv from '$lib/Icons/tv.svelte';
	import Movie from '$lib/Icons/movie.svelte';
	import Controller from '$lib/Icons/controller.svelte';
	import { createEventDispatcher } from 'svelte';
	import NavBar from './navBar.svelte';
	export let header: string;
	export let navBackButton: boolean;
	export let settingsButton: boolean;
	export let tabIndex: number;
	const dispatch = createEventDispatcher();

	function mediaSwitch(tab_index: number) {
		tabIndex = tab_index;
		dispatch('switchMedium', {
			index: tab_index
		});
	}
</script>

<div class="z-10 w-full h-fit">
	<NavBar on:switchMode {header} {navBackButton} {settingsButton}></NavBar>
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
</div>
