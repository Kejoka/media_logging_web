<script lang="ts">
	import Settings from '$lib/Icons/settings.svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import Back from '$lib/Icons/back.svelte';
	import { createEventDispatcher } from 'svelte';
	export let header: string;
	export let nav_back_button: boolean;
	export let settings_button: boolean;
	export let static_header: boolean;
	export let own_profile: boolean | undefined;
	const dispatch = createEventDispatcher();

	const settings_link = $page.url.pathname + '/settings';
	let relative_back_link: string;
	if (own_profile != undefined && !own_profile) {
		relative_back_link = '/';
	} else {
		relative_back_link = $page.url.pathname.split('/').slice(0, -1).join('/');
	}
	let dropdown_open = false;
</script>

<div class="navbar z-10 bg-base-300">
	<div class="navbar-start">
		{#if nav_back_button || !own_profile}
			<a class="btn" href={relative_back_link} data-sveltekit-reload>
				<Back></Back>
			</a>
		{/if}
	</div>
	{#if static_header}
		<p class="font-bold text-lg">{header}</p>
	{:else}
		<details id="dropdown-content" class="dropdown navbar-center" bind:open={dropdown_open}>
			<summary tabindex="0" class="btn text-lg font-semibold"
				>{header}
				{#if dropdown_open}
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
							dropdown_open = false;
							dispatch('switch_mode', { mode: 0 });
						}}
						class="w-full text-left">Medien-Log</button
					>
				</li>
				<li>
					<button
						on:click={(e) => {
							dropdown_open = false;
							dispatch('switch_mode', { mode: 1 });
						}}
						class="w-full text-left">Backlog</button
					>
				</li>
				<li>
					<button
						on:click={(e) => {
							dropdown_open = false;
							dispatch('switch_mode', { mode: 2 });
						}}
						class="w-full text-left">Statistiken</button
					>
				</li>
			</ul>
		</details>
	{/if}
	<div class="navbar-end">
		{#if settings_button && own_profile}
			<button
				class="btn"
				on:click={() => {
					goto(settings_link);
				}}
			>
				<Settings></Settings>
			</button>
		{/if}
	</div>
</div>
