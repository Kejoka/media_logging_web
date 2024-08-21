<script lang="ts">
	import Settings from '$lib/Icons/settings.svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import Back from '$lib/Icons/back.svelte';
	import { createEventDispatcher } from 'svelte';
	export let header: string;
	export let navBackButton: boolean;
	export let settingsButton: boolean;
	const dispatch = createEventDispatcher();

	const settingsLink = $page.url.pathname + '/settings';
	const relativeBackLink = $page.url.pathname.split('/').slice(0, -1).join('/');
	let dropdownOpen = false;
</script>

<div class="navbar z-10 bg-base-300">
	<div class="navbar-start">
		{#if navBackButton}
			<button
				class="btn"
				on:click={() => {
					goto(relativeBackLink);
				}}
			>
				<Back></Back>
			</button>
		{/if}
	</div>
	<details id="dropdown-content" class="dropdown navbar-center" bind:open={dropdownOpen}>
		<summary tabindex="0" class="btn text-lg font-semibold">{header}</summary>
		<ul class="dropdown-content menu bg-base-200 rounded-box z-[1] w-full shadow">
			<li>
				<button
					on:click={(e) => {
						dropdownOpen = false;
						dispatch('switchMode', { mode: 0 });
					}}
					class="w-full text-left">Media Log</button
				>
			</li>
			<li>
				<button
					on:click={(e) => {
						dropdownOpen = false;
						dispatch('switchMode', { mode: 1 });
					}}
					class="w-full text-left">Backlog</button
				>
			</li>
		</ul>
	</details>
	<!-- <div class="navbar-center text-xl font-semibold">{header}</div> -->
	<div class="navbar-end">
		{#if settingsButton}
			<button
				class="btn"
				on:click={() => {
					goto(settingsLink);
				}}
			>
				<Settings></Settings>
			</button>
		{/if}
	</div>
</div>
