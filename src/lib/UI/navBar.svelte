<script lang="ts">
	import Settings from '$lib/Icons/settings.svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import Back from '$lib/Icons/back.svelte';
	export let header: string;
	export let navBackButton: boolean;
	export let settingsButton: boolean;

	const settingsLink = $page.url.pathname + '/settings';
	const relativeBackLink = $page.url.pathname.split('/').slice(0, -1).join('/');
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
	<div class="navbar-center text-xl font-semibold">{header}</div>
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
