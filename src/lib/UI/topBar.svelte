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

	let tab_states = [false, true, false, false];
	const dispatch = createEventDispatcher();

	function mediaSwitch(tab_index: number) {
		let new_tab_states = [false, false, false, false];
		new_tab_states[tab_index] = true;
		tab_states = new_tab_states;
		dispatch('switch', {
			index: tab_index
		});
	}
</script>

<div class="z-10 w-full h-fit">
	<NavBar {header} {navBackButton} {settingsButton}></NavBar>
	<div role="tablist" class="tabs tabs-bordered bg-base-100">
		<button
			role="tab"
			class="tab {tab_states[0] ? 'tab-active' : ''}"
			on:click={() => mediaSwitch(0)}
		>
			<Controller></Controller>
		</button>
		<button
			role="tab"
			class="tab {tab_states[1] ? 'tab-active' : ''}"
			on:click={() => mediaSwitch(1)}
		>
			<Movie></Movie>
		</button>
		<button
			role="tab"
			class="tab {tab_states[2] ? 'tab-active' : ''}"
			on:click={() => mediaSwitch(2)}
		>
			<Tv></Tv>
		</button>
		<button
			role="tab"
			class="tab {tab_states[3] ? 'tab-active' : ''}"
			on:click={() => mediaSwitch(3)}
		>
			<Book></Book>
		</button>
	</div>
</div>
