<script lang="ts">
	import '../app.css';
	import { invalidate } from '$app/navigation';
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import Account from '$lib/Icons/account.svelte';
	import Settings from '$lib/Icons/settings.svelte';


	let { data, children } = $props();
	let { supabase, session, user } = $derived(data);

	onMount(() => {
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

<div class="min-h-screen flex flex-col">
	{#if !isAuthPage && session}
		<nav class="relative top-0 z-10 bg-base-300 shadow-lg shadow-black/30">
			<div class="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
				<a href="/" class="text-lg font-bold text-neutral-300 transition hover:text-neutral-400">
					Media Logging
				</a>
				
				<div class="flex items-center gap-4">
					<a
						href="/account"
						class="rounded-lg px-3 py-1.5 text-sm font-medium text-neutral-300 transition hover:bg-white/10 hover:text-white"
					>
						<Account/>
					</a>
					<a
						href="/account"
						class="rounded-lg px-3 py-1.5 text-sm font-medium text-neutral-300 transition hover:bg-white/10 hover:text-white"
					>
						<Settings/>
					</a>
				</div>
			</div>
		</nav>
	{/if}

	<main class="relative flex flex-col flex-1 min-h-0 z-0">
		{@render children()}
	</main>
</div>
