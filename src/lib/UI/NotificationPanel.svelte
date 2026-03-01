<script lang="ts">
	import { onMount } from 'svelte';
	import NotificationItem from './NotificationItem.svelte';

	let {
		isOpen = $bindable(false),
		onUnreadCountChange
	}: { isOpen?: boolean; onUnreadCountChange?: (count: number) => void } = $props();

	type NotificationType = {
		id: string | number;
		username: string;
		activity_type: 'add' | 'update' | 'delete' | 'bulk_add' | 'follow';
		media_type: 'games' | 'movies' | 'shows' | 'books' | null;
		media_title?: string;
		media_image?: string;
		count?: number;
		created_at: string;
		isUnread: boolean;
	};

	let notifications: NotificationType[] = $state([]);
	let unreadCount: number = $state(0);
	let loading: boolean = $state(false);
	let error: string | null = $state(null);

	onMount(() => {
		loadNotifications();
		// Refresh notifications every 2 minutes
		const interval = setInterval(loadNotifications, 120000);
		return () => clearInterval(interval);
	});

	async function loadNotifications() {
		loading = true;
		error = null;
		try {
			const res = await fetch('/api/v1/getNotifications', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				}
			});

			if (!res.ok) {
				throw new Error('Failed to load notifications');
			}

			const data = (await res.json()) as { notifications: NotificationType[]; unreadCount: number };
			notifications = data.notifications || [];
			unreadCount = data.unreadCount || 0;

			// Notify parent component of unread count change
			if (onUnreadCountChange) {
				onUnreadCountChange(unreadCount);
			}
		} catch (err) {
			console.error('Error loading notifications:', err);
			error = 'Benachrichtigungen konnten nicht geladen werden';
		} finally {
			loading = false;
		}
	}

	async function markAsRead() {
		if (unreadCount === 0) return;

		try {
			await fetch('/api/v1/markNotificationsRead', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				}
			});

			// Update local state
			notifications = notifications.map((n) => ({ ...n, isUnread: false }));
			unreadCount = 0;

			// Notify parent component of unread count change
			if (onUnreadCountChange) {
				onUnreadCountChange(0);
			}
		} catch (err) {
			console.error('Error marking notifications as read:', err);
		}
	}

	async function handleOpen() {
		await loadNotifications();
		await markAsRead();
	}

	$effect(() => {
		if (isOpen) {
			void handleOpen();
		}
	});

	export function getUnreadCount() {
		return unreadCount;
	}
</script>

<!-- Backdrop -->
{#if isOpen}
	<div
		class="fixed inset-0 z-40 bg-black/20"
		onclick={() => (isOpen = false)}
		onkeydown={(e) => e.key === 'Escape' && (isOpen = false)}
		role="button"
		tabindex="0"
		aria-label="Close notifications"
	></div>
{/if}

<!-- Panel -->
<div
	class="fixed top-14 right-4 z-50 w-96 max-w-[calc(100vw-2rem)] transition-all duration-300 {isOpen
		? 'translate-x-0 opacity-100'
		: 'pointer-events-none translate-x-full opacity-0'}"
>
	<div class="flex max-h-[calc(100vh-5rem)] flex-col rounded-lg bg-base-300 shadow-2xl">
		<!-- Header -->
		<div class="flex items-center justify-between border-b border-base-100 px-4 py-3">
			<h2 class="text-lg font-semibold">Benachrichtigungen</h2>
			<button
				onclick={() => (isOpen = false)}
				class="rounded-lg p-1 transition hover:bg-base-200"
				aria-label="Close"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-5 w-5"
					viewBox="0 0 20 20"
					fill="currentColor"
				>
					<path
						fill-rule="evenodd"
						d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
						clip-rule="evenodd"
					/>
				</svg>
			</button>
		</div>

		<!-- Content -->
		<div class="flex-1 overflow-y-auto">
			{#if loading && notifications.length === 0}
				<div class="flex items-center justify-center py-12">
					<div class="text-center">
						<div class="loading loading-md loading-spinner"></div>
						<p class="mt-2 text-sm text-neutral-500">Lade Benachrichtigungen...</p>
					</div>
				</div>
			{:else if error}
				<div class="flex items-center justify-center py-12">
					<div class="text-center">
						<p class="text-sm text-error">{error}</p>
						<button onclick={loadNotifications} class="btn mt-2 btn-ghost btn-sm">
							Erneut versuchen
						</button>
					</div>
				</div>
			{:else if notifications.length === 0}
				<div class="flex items-center justify-center py-12">
					<div class="text-center">
						<p class="mb-2 text-4xl">🔔</p>
						<p class="text-sm text-neutral-500">Keine neuen Benachrichtigungen</p>
					</div>
				</div>
			{:else}
				<div class="divide-y divide-base-100">
					{#each notifications as notification (notification.id)}
						<NotificationItem {notification} />
					{/each}
				</div>
			{/if}
		</div>

		<!-- Footer -->
		{#if notifications.length > 0}
			<div class="border-t border-base-100 px-4 py-2 text-center">
				<p class="text-xs text-neutral-500">Zeige Aktivitäten der letzten 14 Tage</p>
			</div>
		{/if}
	</div>
</div>
