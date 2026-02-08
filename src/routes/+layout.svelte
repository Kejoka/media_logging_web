<script lang="ts">
	import '../app.css';
	import { invalidate } from '$app/navigation';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import Account from '$lib/Icons/account.svelte';
	import Settings from '$lib/Icons/settings.svelte';

	let { data, children } = $props();
	let { supabase, session, user } = $derived(data);

	onMount(() => {
		if (browser && 'serviceWorker' in navigator) {
			navigator.serviceWorker.register('/service-worker.js').catch(() => {
				// ignore registration errors
			});
		}

		const { data } = supabase.auth.onAuthStateChange((event, _session) => {
			if (_session?.expires_at !== session?.expires_at) {
				invalidate('supabase:auth');
			}
		});

		return () => data.subscription.unsubscribe();
	});

	const isAuthPage = $derived(page.url.pathname === '/' || page.url.pathname.startsWith('/auth/'));
</script>

<svelte:head>
	<title>Media Logging Login</title>
</svelte:head>

<!-- Main Div -->
<div class="flex h-screen flex-col">
	{#if !isAuthPage && session}
		<nav class="sticky top-0 right-0 left-0 z-10 bg-base-300 shadow-lg shadow-black/30">
			<div
				class="mx-auto flex items-center justify-between px-10 sm:max-w-md lg:max-w-2xl xl:max-w-4xl"
			>
				<a href="/" class="text-lg font-bold text-neutral-300 transition hover:text-neutral-400">
					Media Logging
				</a>

				<div class="flex items-center gap-4">
					<a
						href="/account"
						class="rounded-lg px-3 py-1.5 text-sm font-medium text-neutral-300 transition hover:bg-white/10 hover:text-white"
					>
						<Account />
					</a>
					<!-- <a
						href="/settings"
						class="rounded-lg px-3 py-1.5 text-sm font-medium text-neutral-300 transition hover:bg-white/10 hover:text-white"
					>
						<Settings/>
					</a> -->
				</div>
			</div>
		</nav>
	{/if}
	<main class="flex min-h-0 flex-1 flex-col overflow-y-hidden">
		{@render children()}
	</main>
</div>
