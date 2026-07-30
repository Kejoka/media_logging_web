<script lang="ts">
	import { onMount } from 'svelte';
	import { goto, invalidateAll } from '$app/navigation';
	import { type mediaObject } from '$lib/dbUtils';
	import NotificationItem from './NotificationItem.svelte';
	import { pushToast } from '$lib/stores/toast';

	let {
		isOpen = $bindable(false),
		onUnreadCountChange
	}: { isOpen?: boolean; onUnreadCountChange?: (count: number) => void } = $props();

	type NotificationType = {
		id: string | number;
		username: string;
		activity_type:
			| 'add'
			| 'update'
			| 'delete'
			| 'follow'
			| 'recommendation'
			| 'recommendation_response';
		media_type: 'games' | 'movies' | 'shows' | 'books' | null;
		media_title?: string;
		media_image?: string;
		count?: number;
		created_at: string;
		isUnread: boolean;
		details?: {
			message?: string;
			status?: string;
			response?: 'accept' | 'decline';
			media_id?: number | string;
			media_year?: number;
			mode?: number | string;
			[key: string]: unknown;
		};
	};

	let notifications: NotificationType[] = $state([]);
	let unreadCount: number = $state(0);
	let loading: boolean = $state(false);
	let error: string | null = $state(null);
	let recommendationModalOpen = $state(false);
	let responseModalOpen = $state(false);
	let recommendationResponseLoading = $state(false);
	let recommendationResponseLoadingAction: 'accept' | 'decline' | null = $state(null);
	let recommendationResponseError: string | null = $state(null);
	let selectedRecommendation: NotificationType | null = $state(null);
	let selectedResponseNotification: NotificationType | null = $state(null);
	let recommendationReplyMessage = $state('');

	function showSupabaseError(error: unknown, fallbackMessage: string) {
		pushToast(error instanceof Error && error.message ? error.message : fallbackMessage, 'error');
	}

	async function dismissNotification(notificationId: string | number) {
		try {
			const res = await fetch('/api/v1/dismissNotification', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ notificationId })
			});
			if (!res.ok) {
				throw new Error('Benachrichtigung konnte nicht entfernt werden.');
			}
			notifications = notifications.filter((n) => n.id !== notificationId);
			if (unreadCount > 0) {
				unreadCount--;
			}
			if (onUnreadCountChange) {
				onUnreadCountChange(unreadCount);
			}
		} catch (err) {
			showSupabaseError(err, 'Benachrichtigung konnte nicht entfernt werden.');
			throw err;
		}
	}

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
			showSupabaseError(err, 'Benachrichtigungen konnten nicht geladen werden');
			error = 'Benachrichtigungen konnten nicht geladen werden';
		} finally {
			loading = false;
		}
	}

	async function markAsRead() {
		if (unreadCount === 0) return;

		try {
			const res = await fetch('/api/v1/markNotificationsRead', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				}
			});
			if (!res.ok) {
				throw new Error('Benachrichtigungen konnten nicht als gelesen markiert werden.');
			}

			// Update local state
			notifications = notifications.map((n) => ({ ...n, isUnread: false }));
			unreadCount = 0;

			// Notify parent component of unread count change
			if (onUnreadCountChange) {
				onUnreadCountChange(0);
			}
		} catch (err) {
			showSupabaseError(err, 'Benachrichtigungen konnten nicht als gelesen markiert werden.');
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

	async function handleNotificationDismiss(notificationId: string | number) {
		await dismissNotification(notificationId);
	}

	function openRecommendationModal(notification: NotificationType) {
		selectedRecommendation = notification;
		recommendationReplyMessage = '';
		recommendationResponseError = null;
		recommendationModalOpen = true;
	}

	function closeRecommendationModal() {
		recommendationModalOpen = false;
		selectedRecommendation = null;
		recommendationReplyMessage = '';
		recommendationResponseError = null;
	}

	async function openRecommendationResponseModal(notification: NotificationType) {
		try {
			await dismissNotification(notification.id);
		} catch {
			return;
		}
		selectedResponseNotification = notification;
		responseModalOpen = true;
	}

	function closeResponseModal() {
		responseModalOpen = false;
		selectedResponseNotification = null;
	}

	async function openResponseProfile(notification: NotificationType | null) {
		if (!notification) {
			return;
		}
		const mediaId = notification.details?.media_id;
		const mediaType = notification.media_type;
		const mediaYear = notification.details?.media_year;
		const rawMode = notification.details?.mode;
		const rawBacklogged = notification.details?.backlogged;
		const parsedMode =
			typeof rawMode === 'number'
				? rawMode
				: rawMode != null
					? Number(rawMode)
					: rawBacklogged != null
						? Number(rawBacklogged)
						: Number.NaN;
		let url = `/${notification.username}`;

		const params = new URLSearchParams();
		if (mediaId) params.append('mediaId', String(mediaId));
		if (mediaType) params.append('mediaType', mediaType);
		if (mediaYear) params.append('mediaYear', String(mediaYear));
		if (Number.isInteger(parsedMode) && parsedMode >= 0 && parsedMode <= 2) {
			params.append('mode', String(parsedMode));
		}
		if (params.size > 0) {
			url += `?${params.toString()}`;
		}
		closeResponseModal();
		await goto(url);
	}

	async function respondToRecommendation(action: 'accept' | 'decline') {
		if (!selectedRecommendation) {
			return;
		}
		recommendationResponseLoading = true;
		recommendationResponseLoadingAction = action;
		recommendationResponseError = null;
		try {
			const res = await fetch('/api/v1/respondRecommendation', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					recommendationId: selectedRecommendation.id,
					action,
					message: recommendationReplyMessage
				})
			});
			const json = (await res.json()) as {
				error?: string;
				action?: 'accept' | 'decline';
				media_id?: number | string | null;
				media_type?: 'games' | 'movies' | 'shows' | 'books' | null;
				resolved_medium?: {
					id: number;
					added?: string;
					notes?: string;
					backlogged?: number;
				} | null;
			};
			if (!res.ok) {
				throw new Error(json.error || 'Antwort konnte nicht gesendet werden');
			}
			await dismissNotification(selectedRecommendation.id);
			closeRecommendationModal();
			await invalidateAll();
			await loadNotifications();
		} catch (err) {
			showSupabaseError(err, 'Antwort konnte nicht gesendet werden');
			recommendationResponseError =
				err instanceof Error ? err.message : 'Antwort konnte nicht gesendet werden';
		} finally {
			recommendationResponseLoading = false;
			recommendationResponseLoadingAction = null;
		}
	}

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
	class="fixed top-14 right-6 z-50 w-96 max-w-[calc(100vw-3rem)] transition-all duration-300 sm:right-4 sm:max-w-[calc(100vw-2rem)] {isOpen
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
		<div class="scrollbar-hide flex-1 overflow-y-auto">
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
						<NotificationItem
							{notification}
							onDismiss={handleNotificationDismiss}
							onOpenRecommendation={openRecommendationModal}
							onOpenRecommendationResponse={openRecommendationResponseModal}
						/>
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

{#if recommendationModalOpen && selectedRecommendation}
	<div class="modal-open modal" role="dialog">
		<div
			class="scrollbar-hide modal-box flex max-h-[85dvh] w-[94vw] max-w-lg flex-col gap-3 overflow-y-auto rounded-2xl border border-base-content/10 bg-base-300 p-4 shadow-2xl"
		>
			<p class="text-lg font-bold">Empfehlung von @{selectedRecommendation.username}</p>
			{#if selectedRecommendation.media_title}
				<p class="mt-1 text-lg opacity-80">{selectedRecommendation.media_title}</p>
			{/if}
			<p class="mt-3 text-sm">
				{selectedRecommendation.details?.message &&
				String(selectedRecommendation.details?.message).trim().length > 0
					? String(selectedRecommendation.details?.message)
					: 'Keine zusätzliche Nachricht'}
			</p>

			<label class="form-control mt-3 w-full">
				<span class="mb-1 text-xs opacity-70">Antwort-Nachricht (optional)</span>
				<textarea
					class="textarea-bordered textarea w-full"
					placeholder="Antwort..."
					bind:value={recommendationReplyMessage}
				></textarea>
			</label>

			{#if recommendationResponseError}
				<p class="mt-2 text-sm text-error">{recommendationResponseError}</p>
			{/if}

			<div class="mt-4 flex flex-wrap justify-end gap-2">
				<button
					type="button"
					class="btn flex-1 btn-error"
					disabled={recommendationResponseLoading}
					onclick={() => respondToRecommendation('decline')}
				>
					{recommendationResponseLoading && recommendationResponseLoadingAction === 'decline'
						? 'Sende...'
						: 'Ablehnen'}
				</button>
				<button
					type="button"
					class="btn flex-1 btn-success"
					disabled={recommendationResponseLoading}
					onclick={() => respondToRecommendation('accept')}
				>
					{recommendationResponseLoading && recommendationResponseLoadingAction === 'accept'
						? 'Sende...'
						: 'Annehmen'}
				</button>
			</div>
		</div>
		<button type="button" class="modal-backdrop" onclick={closeRecommendationModal}>Close</button>
	</div>
{/if}

{#if responseModalOpen && selectedResponseNotification}
	<div class="modal-open modal" role="dialog">
		<div
			class="scrollbar-hide modal-box flex max-h-[85dvh] w-[94vw] max-w-lg flex-col gap-3 overflow-y-auto rounded-2xl border border-base-content/10 bg-base-300 p-4 shadow-2xl"
		>
			<div class="flex items-start justify-between gap-3">
				<div>
					<p class="text-lg font-bold">Antwort auf deine Empfehlung</p>
					<p class="text-sm opacity-80">Von @{selectedResponseNotification.username}</p>
				</div>
			</div>
			{#if selectedResponseNotification.media_title}
				<p class="mt-2 text-base font-semibold">{selectedResponseNotification.media_title}</p>
			{/if}
			<div class="mt-3 space-y-3 text-sm">
				{#if selectedResponseNotification.details?.response_message}
					<p class="rounded-lg bg-base-200 p-3">
						{selectedResponseNotification.details.response_message}
					</p>
				{:else}
					<p class="text-base-content/70">Keine zusätzliche Nachricht vorhanden.</p>
				{/if}
			</div>
		</div>
		<button type="button" class="modal-backdrop" onclick={closeResponseModal}>Close</button>
	</div>
{/if}
