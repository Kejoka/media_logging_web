<script lang="ts">
	import '../app.css';
	import { afterNavigate, beforeNavigate, goto, invalidate } from '$app/navigation';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import Account from '$lib/Icons/account.svelte';
	import Back from '$lib/Icons/back.svelte';
	import Icon from '$lib/Icons/Icon.svelte';
	import UserFollow from '$lib/Icons/user_follow.svelte';
	import UserUnfollow from '$lib/Icons/user_unfollow.svelte';
	import Group from '$lib/Icons/group.svelte';
	import Notifications from '$lib/Icons/notifications.svelte';
	import NotificationsUnread from '$lib/Icons/notifications_unread.svelte';
	import NotificationPanel from '$lib/UI/NotificationPanel.svelte';
	import FollowerPanel from '$lib/UI/FollowerPanel.svelte';
	import { dismissToast, pushToast, toastMessages } from '$lib/stores/toast';
	import {
		enabled_media_types,
		is_account_page,
		is_auth_page,
		is_own_profile,
		is_profile_transition_loading,
		is_profile_root_page,
		route_profile_username
	} from '../stores/uiState';
	import { MEDIA_TYPE_ORDER, normalize_enabled_media_types } from '$lib/utils';

	let { data, children } = $props();
	let { supabase, session, user, ownProfileUsername, ownProfileEnabledMediaTypes } = $derived(data);

	// Determine if the current page is the user's own profile or someone else's
	let followingUser = $state(false);
	let notificationPanelOpen = $state(false);
	let followerPanelOpen = $state(false);
	let unreadCount = $state(0);

	function isProfileRoute(pathname: string | null | undefined): boolean {
		if (!pathname) {
			return false;
		}
		if (pathname === '/' || pathname === '/account' || pathname.startsWith('/auth/')) {
			return false;
		}
		return /^\/[^/]+$/.test(pathname);
	}

	beforeNavigate((navigation) => {
		const fromPath = navigation.from?.url.pathname ?? page.url.pathname;
		const toPath = navigation.to?.url.pathname;
		if (isProfileRoute(fromPath) || isProfileRoute(toPath)) {
			is_profile_transition_loading.set(true);
		}
	});

	afterNavigate((navigation) => {
		const toPath = navigation.to?.url.pathname ?? page.url.pathname;
		if (!isProfileRoute(toPath)) {
			is_profile_transition_loading.set(false);
		}
	});

	$effect(() => {
		const raw_media_types = ownProfileEnabledMediaTypes?.join(',') ?? MEDIA_TYPE_ORDER.join(',');
		enabled_media_types.set(normalize_enabled_media_types(raw_media_types));

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
		} else if (ownProfile || authPage || accountPage || !profileRootPage) {
			followingUser = false;
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
					if (!res.ok) {
						throw new Error('Benachrichtigungen konnten nicht geladen werden.');
					}
					if (res.ok) {
						const responseData = (await res.json()) as {
							notifications: any[];
							unreadCount: number;
						};
						unreadCount = responseData.unreadCount || 0;
					}
				} catch (err) {
					pushToast(
						err instanceof Error && err.message
							? err.message
							: 'Benachrichtigungen konnten nicht geladen werden.',
						'error'
					);
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

	function toggleNotificationPanel() {
		notificationPanelOpen = !notificationPanelOpen;
		if (notificationPanelOpen) {
			followerPanelOpen = false;
		}
	}

	function toggleFollowerPanel() {
		followerPanelOpen = !followerPanelOpen;
		if (followerPanelOpen) {
			notificationPanelOpen = false;
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
			<div class="relative flex min-h-12 w-full items-center px-4 py-2">
				<!-- Left icons -->
				<div class="z-10 flex min-w-0 items-center justify-start">
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
						class="absolute top-1/2 left-1/2 w-[calc(100%-12rem)] -translate-x-1/2 -translate-y-1/2 truncate text-center text-lg font-bold whitespace-nowrap text-neutral-300 transition hover:text-neutral-400"
					>
						Deine Medien
					</p>
				{:else if !$is_own_profile && !$is_account_page && $is_profile_root_page}
					<p
						title={$route_profile_username + "'s Medien"}
						class="absolute top-1/2 left-1/2 w-[calc(100%-12rem)] -translate-x-1/2 -translate-y-1/2 truncate text-center text-lg font-bold whitespace-nowrap text-neutral-300 transition hover:text-neutral-400"
					>
						{$route_profile_username + "'s"} Medien
					</p>
				{/if}

				<!-- Right icons -->
				<div class="z-10 ml-auto flex min-w-0 items-center justify-end gap-1.5">
					{#if !$is_own_profile && !followingUser && $is_profile_root_page}
						<button onclick={toggleFollow}>
							<UserFollow />
						</button>
					{:else if !$is_own_profile && followingUser && $is_profile_root_page}
						<button onclick={toggleFollow}>
							<UserUnfollow />
						</button>
					{:else if $is_own_profile}
						<button onclick={toggleFollowerPanel} aria-label="Follower anzeigen" title="Follower">
							<Group />
						</button>
						<button
							onclick={toggleNotificationPanel}
							aria-label="Benachrichtigungen anzeigen"
							title="Benachrichtigungen"
						>
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

	{#if $toastMessages.length > 0}
		<div class="fixed top-4 right-4 z-50 flex w-[calc(100vw-2rem)] max-w-md flex-col gap-2">
			{#each $toastMessages as toast (toast.id)}
				<div
					class="pointer-events-auto alert shadow-lg"
					class:alert-error={toast.kind === 'error'}
					class:alert-success={toast.kind === 'success'}
					class:alert-info={toast.kind === 'info'}
				>
					<span>{toast.message}</span>
					<button type="button" class="btn btn-ghost btn-xs" onclick={() => dismissToast(toast.id)}>
						Dismiss
					</button>
				</div>
			{/each}
		</div>
	{/if}

	{#if $is_profile_transition_loading}
		<div
			class="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-base-300/85 backdrop-blur-sm"
		>
			<div class="flex flex-col items-center gap-3">
				<span class="loading m-auto mt-3 loading-xl loading-dots"></span>
			</div>
		</div>
	{/if}

	<!-- Notification Panel -->
	{#if !$is_auth_page && session && $is_own_profile}
		<NotificationPanel
			bind:isOpen={notificationPanelOpen}
			onUnreadCountChange={(count) => (unreadCount = count)}
		/>
		<FollowerPanel bind:isOpen={followerPanelOpen} />
	{/if}
</div>
