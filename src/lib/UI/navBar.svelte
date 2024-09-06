<script lang="ts">
	import Settings from '$lib/Icons/settings.svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import Back from '$lib/Icons/back.svelte';
	import { createEventDispatcher } from 'svelte';
	export let header: string;
	export let navBackButton: boolean;
	export let settingsButton: boolean;
	export let staticHeader: boolean;
	export let own_profile: boolean | undefined;
	const dispatch = createEventDispatcher();

	const settingsLink = $page.url.pathname + '/settings';
	let relativeBackLink: string;
	if (own_profile != undefined && !own_profile) {
		relativeBackLink = '/';
	} else {
		relativeBackLink = $page.url.pathname.split('/').slice(0, -1).join('/');
	}
	let dropdownOpen = false;
</script>

<div class="navbar z-10 bg-base-300">
	<div class="navbar-start">
		{#if navBackButton || !own_profile}
			<a class="btn" href={relativeBackLink} data-sveltekit-reload>
				<Back></Back>
			</a>
		{/if}
	</div>
	{#if staticHeader}
		<p class="font-bold text-lg">{header}</p>
	{:else}
		<details id="dropdown-content" class="dropdown navbar-center" bind:open={dropdownOpen}>
			<summary tabindex="0" class="btn text-lg font-semibold"
				>{header}
				{#if dropdownOpen}
					<svg
						class="w-5 h-5 inset-x-0 -scale-100"
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
						class="w-5 h-5 inset-x-0"
						fill="none"
						stroke="var(--fallback-nc,oklch(var(--nc)/1))"
						stroke-width="2"
						viewBox="0 0 24 24"
						xmlns="http://www.w3.org/2000/svg"
					>
						<path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"></path>
					</svg>
				{/if}
			</summary>
			<ul class="dropdown-content menu bg-base-200 rounded-box z-[1] w-full shadow">
				<li>
					<button
						on:click={(e) => {
							dropdownOpen = false;
							dispatch('switchMode', { mode: 0 });
						}}
						class="w-full text-left">Medien-Log</button
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
				<li>
					<button
						on:click={(e) => {
							dropdownOpen = false;
							dispatch('switchMode', { mode: 2 });
						}}
						class="w-full text-left">Statistiken</button
					>
				</li>
			</ul>
		</details>
	{/if}
	<div class="navbar-end">
		{#if settingsButton && own_profile}
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
