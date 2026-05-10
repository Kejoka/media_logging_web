<script lang="ts">
	import { goto } from '$app/navigation';

	type NotificationItemType = {
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
		created_at: string;
		isUnread: boolean;
		details?: {
			media_id?: string | number;
			media_year?: number;
			mode?: number | string;
			backlogged?: number | string;
			[key: string]: any;
		};
	};

	let {
		notification,
		onDismiss,
		onOpenRecommendation,
		onOpenRecommendationResponse
	}: {
		notification: NotificationItemType;
		onDismiss?: (notificationId: string | number) => void;
		onOpenRecommendation?: (notification: NotificationItemType) => void;
		onOpenRecommendationResponse?: (notification: NotificationItemType) => void;
	} = $props();

	let isLoading = $state(false);

	async function handleDismiss(e: Event) {
		e.stopPropagation();
		isLoading = true;
		try {
			const res = await fetch('/api/v1/dismissNotification', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ notificationId: notification.id })
			});

			if (!res.ok) {
				throw new Error('Failed to dismiss notification');
			}

			// Notify parent component
			if (onDismiss) {
				onDismiss(notification.id);
			}
		} catch (err) {
			console.error('Error dismissing notification:', err);
		} finally {
			isLoading = false;
		}
	}

	async function handleClick() {
		if (
			notification.activity_type === 'recommendation' &&
			notification.details?.status === 'pending' &&
			onOpenRecommendation
		) {
			onOpenRecommendation(notification);
			return;
		}

		if (notification.activity_type === 'recommendation_response' && onOpenRecommendationResponse) {
			onOpenRecommendationResponse(notification);
			return;
		}

		// Mark as dismissed when clicked
		try {
			await fetch('/api/v1/dismissNotification', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ notificationId: notification.id })
			});
		} catch (err) {
			console.error('Error auto-dismissing notification:', err);
		}

		// Build URL with media parameters including year
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

		await goto(url);
	}

	function getMediaTypeIcon(mediaType: string) {
		const icons: Record<string, string> = {
			games: '🎮',
			movies: '🎬',
			shows: '📺',
			books: '📚'
		};
		return icons[mediaType] || '📌';
	}

	function getMediaTypeName(mediaType: string) {
		const names: Record<string, string> = {
			games: 'Spiel',
			movies: 'Film',
			shows: 'Serie',
			books: 'Buch'
		};
		return names[mediaType] || 'Medium';
	}

	function getActivityText(notification: NotificationItemType) {
		if (notification.activity_type === 'follow') {
			return 'folgt dir jetzt';
		}
		if (notification.activity_type === 'recommendation') {
			return 'hat dir eine Empfehlung geschickt';
		}
		if (notification.activity_type === 'recommendation_response') {
			return notification.details?.response === 'accept'
				? 'hat deine Empfehlung angenommen'
				: 'hat deine Empfehlung abgelehnt';
		}

		const mediaName = getMediaTypeName(notification.media_type || 'games');

		switch (notification.activity_type) {
			case 'add':
				return notification.details?.backlogged === 0
					? `hat ${mediaName} hinzugefügt`
					: `will ${mediaName} ${getConsumeVerb(notification.media_type || '')}`;
			case 'update':
				return `hat ${mediaName} aktualisiert`;
			case 'delete':
				return `hat ${mediaName} gelöscht`;
			default:
				return 'hat eine Änderung vorgenommen';
		}
	}

	function getConsumeVerb(mediaType: string) {
		const verbs: Record<string, string> = {
			games: 'spielen',
			movies: 'schauen',
			shows: 'schauen',
			books: 'lesen'
		};
		return verbs[mediaType] || 'konsumiert';
	}

	function getTimeAgo(dateString: string) {
		const date = new Date(dateString);
		const now = new Date();
		const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

		if (diffInSeconds < 60) return 'gerade eben';
		if (diffInSeconds < 3600) return `vor ${Math.floor(diffInSeconds / 60)}m`;
		if (diffInSeconds < 86400) return `vor ${Math.floor(diffInSeconds / 3600)}h`;
		return `vor ${Math.floor(diffInSeconds / 86400)}d`;
	}
</script>

<div
	class="cursor-pointer border-l-4 px-4 py-3 transition hover:bg-base-200 {notification.isUnread
		? 'border-info bg-base-200/50'
		: 'border-transparent'}"
	onclick={handleClick}
	onkeydown={(e) => e.key === 'Enter' && handleClick()}
	role="button"
	tabindex="0"
>
	<div class="flex items-start gap-3">
		<!-- Icon or Image -->
		<div class="shrink-0">
			{#if notification.activity_type === 'follow'}
				<span class="text-2xl">👤</span>
			{:else if notification.media_image}
				<img
					src={notification.media_image}
					alt={notification.media_title}
					class="h-12 w-8 rounded object-cover"
				/>
			{:else}
				<span class="text-2xl">{getMediaTypeIcon(notification.media_type || 'games')}</span>
			{/if}
		</div>

		<!-- Content -->
		<div class="min-w-0 flex-1">
			<p class="text-sm">
				<span class="font-semibold">{notification.username}</span>
				<span class="text-neutral-400"> {getActivityText(notification)}</span>
			</p>
			{#if notification.media_title}
				<p class="mt-1 truncate text-sm text-neutral-500">
					{notification.media_title}
				</p>
			{/if}
			<p class="mt-1 text-xs text-neutral-500">
				{getTimeAgo(notification.created_at)}
			</p>
		</div>

		<!-- Unread indicator and Dismiss button -->
		<div class="flex shrink-0 items-center gap-2">
			{#if notification.isUnread}
				<div class="h-2 w-2 rounded-full bg-info"></div>
			{/if}
			<!-- Dismiss button (X) -->
			<button
				onclick={handleDismiss}
				disabled={isLoading}
				class="rounded-lg p-1 transition hover:bg-base-200 hover:opacity-70 disabled:opacity-50"
				aria-label="Benachrichtigung löschen"
				title="Benachrichtigung löschen"
			>
				{#if isLoading}
					<span class="loading loading-xs loading-spinner"></span>
				{:else}
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-4 w-4 opacity-50 hover:opacity-100"
						viewBox="0 0 20 20"
						fill="currentColor"
					>
						<path
							fill-rule="evenodd"
							d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
							clip-rule="evenodd"
						/>
					</svg>
				{/if}
			</button>
		</div>
	</div>
</div>
