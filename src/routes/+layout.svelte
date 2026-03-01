<script lang="ts">
	import '../app.css';
	import { goto, invalidate } from '$app/navigation';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import Account from '$lib/Icons/account.svelte';
	import Back from '$lib/Icons/back.svelte';
	import Icon from '$lib/Icons/Icon.svelte';
	import UserFollow from '$lib/Icons/user_follow.svelte';
	import UserUnfollow from '$lib/Icons/user_unfollow.svelte';
	import Notifications from '$lib/Icons/notifications.svelte';
	import NotificationsUnread from '$lib/Icons/notifications_unread.svelte';
	import NotificationPanel from '$lib/UI/NotificationPanel.svelte';

	let { data, children } = $props();
	let { supabase, session, user } = $derived(data);

	// Determine if the current page is the user's own profile or someone else's
	let isOwnProfile = $state(false);
	let followingUser = $state(false);
	let notificationPanelOpen = $state(false);
	let unreadCount = $state(0);
	const isAuthPage = $derived(page.url.pathname === '/' || page.url.pathname.startsWith('/auth/'));
	const isAccountPage = $derived(page.url.pathname === '/account');

	$effect(() => {
		const path = page.url.pathname;
		if (!user) {
			isOwnProfile = false;
		} else if (isAccountPage) {
			isOwnProfile = true;
		} else {
			const match = path.match(/^\/(\w+)$/);
			isOwnProfile = !!(match && match[1] === user.user_metadata.username);
			console.log(match);
		}
		if (!isOwnProfile && !isAuthPage && !isAccountPage) {
			checkIfFollowing();
		}
		console.log(user, isOwnProfile, isAuthPage, isAccountPage);
	});

	onMount(() => {
		if (browser && 'serviceWorker' in navigator) {
			navigator.serviceWorker.register('/service-worker.js').catch(() => {});
		}

		const { data } = supabase.auth.onAuthStateChange((event, _session) => {
			if (_session?.expires_at !== session?.expires_at) {
				invalidate('supabase:auth');
			}
		});

		// Check unread notifications periodically
		const checkUnread = async () => {
			if (user && isOwnProfile && !notificationPanelOpen) {
				try {
					const res = await fetch('/api/v1/getNotifications', {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json'
						}
					});
					if (res.ok) {
						const responseData = (await res.json()) as {
							notifications: any[];
							unreadCount: number;
						};
						unreadCount = responseData.unreadCount || 0;
					}
				} catch (err) {
					console.error('Error checking unread notifications:', err);
				}
			}
		};

		checkUnread();
		const unreadInterval = setInterval(checkUnread, 30000); // Check every 30 seconds

		return () => {
			data.subscription.unsubscribe();
			clearInterval(unreadInterval);
		};
	});

	async function checkIfFollowing() {
		if (!user) return;
		const res = await fetch('/api/v1/followCheck', {
			method: 'POST',
			body: JSON.stringify({
				followee: page.url.pathname.slice(1)
			}),
			headers: {
				'Content-Type': 'application/json'
			}
		});
		const json: { following: boolean } = await res.json();
		followingUser = json.following;
	}

	async function toggleFollow() {
		const res = await fetch('/api/v1/followUser', {
			method: 'POST',
			body: JSON.stringify({
				followee: page.url.pathname.slice(1)
			}),
			headers: {
				'Content-Type': 'application/json'
			}
		});
		const json: { type?: 'follow' | 'unfollow' } = await res.json();
		try {
			if (json.type === 'follow') {
				followingUser = true;
			} else if (json.type === 'unfollow') {
				followingUser = false;
			}
		} catch (error) {
			console.error('Error processing follow toggle response:', error);
		}
	}
</script>

<svelte:head>
	<title>Media Logging Login</title>
</svelte:head>

<!-- Main Div -->
<div class="flex h-screen flex-col">
	{#if !isAuthPage && session}
		<nav class="sticky top-0 right-0 left-0 z-10 bg-base-300 shadow-lg shadow-black/30">
			<div class="relative flex min-h-12 w-full flex-row items-center px-4 py-2">
				<!-- Left icons -->
				<div class="flex items-center">
					{#if isOwnProfile && !isAccountPage}
						<Icon />
					{:else if !isOwnProfile && !isAccountPage}
						<button
							type="button"
							class="m-0 cursor-pointer border-none bg-transparent p-0"
							onclick={() => goto(`/${user?.user_metadata.username}`)}
						>
							<Back />
						</button>
					{:else if isAccountPage}
						<button
							type="button"
							class="m-0 cursor-pointer border-none bg-transparent p-0"
							onclick={() => goto(`/${user?.user_metadata.username}`)}
						>
							<Back />
						</button>
					{:else}
						<Icon />
					{/if}
				</div>

				<!-- Centered title -->
				{#if isOwnProfile && !isAccountPage}
					<p
						class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-lg font-bold whitespace-nowrap text-neutral-300 transition hover:text-neutral-400"
					>
						Deine Medien
					</p>
				{:else if !isOwnProfile && !isAccountPage}
					<p
						class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-lg font-bold whitespace-nowrap text-neutral-300 transition hover:text-neutral-400"
					>
						{page.url.pathname.slice(1) + "'s"} Medien
					</p>
				{/if}

				<!-- Right icons -->
				<div class="ml-auto flex items-center gap-2">
					{#if !isOwnProfile && !followingUser}
						<button onclick={toggleFollow}>
							<UserFollow />
						</button>
					{:else if !isOwnProfile && followingUser}
						<button onclick={toggleFollow}>
							<UserUnfollow />
						</button>
					{:else if isOwnProfile}
						<button onclick={() => (notificationPanelOpen = !notificationPanelOpen)}>
							{#if unreadCount > 0}
								<NotificationsUnread />
							{:else}
								<Notifications />
							{/if}
						</button>
					{/if}
					<a href="/account" class="rounded-lg hover:bg-white/10 hover:text-white">
						<Account />
					</a>
				</div>
			</div>
		</nav>
	{/if}
	<main class="flex min-h-0 flex-1 flex-col overflow-y-hidden">
		{#key page.url.pathname}
			{@render children()}
		{/key}
	</main>

	<!-- Notification Panel -->
	{#if !isAuthPage && session && isOwnProfile}
		<NotificationPanel
			bind:isOpen={notificationPanelOpen}
			onUnreadCountChange={(count) => (unreadCount = count)}
		/>
	{/if}
</div>
