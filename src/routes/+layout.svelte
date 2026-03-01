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
	import {
		is_account_page,
		is_auth_page,
		is_own_profile,
		is_profile_root_page,
		route_profile_username
	} from '../stores/uiState';

	let { data, children } = $props();
	let { supabase, session, user, ownProfileUsername } = $derived(data);

	// Determine if the current page is the user's own profile or someone else's
	let followingUser = $state(false);
	let notificationPanelOpen = $state(false);
	let unreadCount = $state(0);

	$effect(() => {
		const path = page.url.pathname;
		const authPage = path === '/' || path.startsWith('/auth/');
		const accountPage = path === '/account';
		const pathSegments = path.split('/').filter(Boolean);
		const firstSegment = pathSegments[0] ?? null;
		const profileRootPage = pathSegments.length === 1 && firstSegment !== null;

		is_auth_page.set(authPage);
		is_account_page.set(accountPage);
		is_profile_root_page.set(profileRootPage);
		route_profile_username.set(firstSegment);

		const ownProfile =
			!!user && (accountPage || !!(firstSegment && ownProfileUsername === firstSegment));
		is_own_profile.set(ownProfile);

		if (!ownProfile && !authPage && !accountPage && profileRootPage) {
			checkIfFollowing();
		}
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
			if (user && $is_own_profile && !notificationPanelOpen) {
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
		if (!$route_profile_username) return;
		const res = await fetch('/api/v1/followCheck', {
			method: 'POST',
			body: JSON.stringify({
				followee: $route_profile_username
			}),
			headers: {
				'Content-Type': 'application/json'
			}
		});
		const json: { following: boolean } = await res.json();
		followingUser = json.following;
	}

	async function toggleFollow() {
		if (!$route_profile_username) return;
		const res = await fetch('/api/v1/followUser', {
			method: 'POST',
			body: JSON.stringify({
				followee: $route_profile_username
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
	{#if !$is_auth_page && session}
		<nav class="sticky top-0 right-0 left-0 z-10 bg-base-300 shadow-lg shadow-black/30">
			<div class="relative flex min-h-12 w-full flex-row items-center px-4 py-2">
				<!-- Left icons -->
				<div class="flex items-center">
					{#if $is_own_profile && !$is_account_page}
						<Icon />
					{:else if !$is_own_profile && !$is_account_page}
						<button
							type="button"
							class="m-0 cursor-pointer border-none bg-transparent p-0"
							onclick={() => goto(ownProfileUsername ? `/${ownProfileUsername}` : '/account')}
						>
							<Back />
						</button>
					{:else if $is_account_page}
						<button
							type="button"
							class="m-0 cursor-pointer border-none bg-transparent p-0"
							onclick={() => goto(ownProfileUsername ? `/${ownProfileUsername}` : '/account')}
						>
							<Back />
						</button>
					{:else}
						<Icon />
					{/if}
				</div>

				<!-- Centered title -->
				{#if $is_own_profile && !$is_account_page}
					<p
						class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-lg font-bold whitespace-nowrap text-neutral-300 transition hover:text-neutral-400"
					>
						Deine Medien
					</p>
				{:else if !$is_own_profile && !$is_account_page && $is_profile_root_page}
					<p
						class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-lg font-bold whitespace-nowrap text-neutral-300 transition hover:text-neutral-400"
					>
						{$route_profile_username + "'s"} Medien
					</p>
				{/if}

				<!-- Right icons -->
				<div class="ml-auto flex items-center gap-2">
					{#if !$is_own_profile && !followingUser && $is_profile_root_page}
						<button onclick={toggleFollow}>
							<UserFollow />
						</button>
					{:else if !$is_own_profile && followingUser && $is_profile_root_page}
						<button onclick={toggleFollow}>
							<UserUnfollow />
						</button>
					{:else if $is_own_profile}
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
	{#if !$is_auth_page && session && $is_own_profile}
		<NotificationPanel
			bind:isOpen={notificationPanelOpen}
			onUnreadCountChange={(count) => (unreadCount = count)}
		/>
	{/if}
</div>
