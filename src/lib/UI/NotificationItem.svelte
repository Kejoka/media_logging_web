<script lang="ts">
	import { goto } from '$app/navigation';
	import { pushToast } from '$lib/stores/toast';

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
		media_type: 'games' | 'movies' | 'shows' | 'books' | 'music' | null;
		media_title?: string;
		media_image?: string;
		created_at: string;
		isUnread: boolean;
		details?: {
			media_id?: string | number;
			media_year?: number;
			mode?: number | string;
			backlogged?: number | string;
			music_type?: 'album' | 'ep' | 'single' | string;
			status?: string;
			response?: 'accept' | 'decline';
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

	function showSupabaseError(error: unknown, fallbackMessage: string) {
		pushToast(error instanceof Error && error.message ? error.message : fallbackMessage, 'error');
	}

	async function dismissNotification() {
		const res = await fetch('/api/v1/dismissNotification', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ notificationId: notification.id })
		});

		if (!res.ok) {
			throw new Error('Benachrichtigung konnte nicht entfernt werden.');
		}
	}

	async function handleDismiss(e: MouseEvent) {
		e.stopPropagation();
		isLoading = true;
		try {
			await dismissNotification();
			onDismiss?.(notification.id);
		} catch (error) {
			showSupabaseError(error, 'Benachrichtigung konnte nicht entfernt werden.');
		} finally {
			isLoading = false;
		}
	}

	async function handleClick() {
		if (
			notification.activity_type === 'recommendation' &&
			notification.details?.status === 'pending'
		) {
			onOpenRecommendation?.(notification);
			return;
		}

		if (notification.activity_type === 'recommendation_response') {
			onOpenRecommendationResponse?.(notification);
			return;
		}

		try {
			await dismissNotification();
		} catch (error) {
			showSupabaseError(error, 'Benachrichtigung konnte nicht entfernt werden.');
		}

		const params = new URLSearchParams();
		const mediaId = notification.details?.media_id;
		const mediaType = notification.media_type;
		const mediaYear = notification.details?.media_year;
		const modeValue = notification.details?.mode;
		const backloggedValue = notification.details?.backlogged;
		const parsedMode =
			typeof modeValue === 'number'
				? modeValue
				: modeValue != null
					? Number(modeValue)
					: backloggedValue != null
						? Number(backloggedValue)
						: Number.NaN;

		if (mediaId) params.set('mediaId', String(mediaId));
		if (mediaType) params.set('mediaType', mediaType);
		if (mediaYear) params.set('mediaYear', String(mediaYear));
		if (Number.isFinite(parsedMode) && parsedMode >= 0 && parsedMode <= 2) {
			params.set('mode', String(parsedMode));
		}

		const queryString = params.toString();
		await goto(
			queryString ? `/${notification.username}?${queryString}` : `/${notification.username}`
		);
	}

	function getMediaTypeName(mediaType: string) {
		const names: Record<string, string> = {
			games: 'Spiel',
			movies: 'Film',
			shows: 'Serie',
			books: 'Buch',
			music: 'Musik'
		};
		return names[mediaType] || 'Medium';
	}

	function getConsumeVerb(mediaType: string) {
		const verbs: Record<string, string> = {
			games: 'spielen',
			movies: 'schauen',
			shows: 'schauen',
			books: 'lesen',
			music: 'hören'
		};
		return verbs[mediaType] || 'konsumiert';
	}

	function getMusicTypeName(musicType?: string) {
		if (musicType === 'ep') return 'EP';
		if (musicType === 'single') return 'Single';
		return 'Album';
	}

	function getActivityText(currentNotification: NotificationItemType) {
		if (currentNotification.activity_type === 'follow') {
			return 'folgt dir jetzt';
		}
		if (currentNotification.activity_type === 'recommendation') {
			return 'hat dir eine Empfehlung geschickt';
		}
		if (currentNotification.activity_type === 'recommendation_response') {
			return currentNotification.details?.response === 'accept'
				? 'hat deine Empfehlung angenommen'
				: 'hat deine Empfehlung abgelehnt';
		}

		const mediaName = getMediaTypeName(currentNotification.media_type || 'games');
		switch (currentNotification.activity_type) {
			case 'add': {
				if (currentNotification.media_type === 'music') {
					const musicType = getMusicTypeName(currentNotification.details?.music_type);
					return currentNotification.details?.backlogged === 0
						? `hat ${musicType} hinzugefügt`
						: `will ${musicType} hören`;
				}
				return currentNotification.details?.backlogged === 0
					? `hat ${mediaName} hinzugefügt`
					: `will ${mediaName} ${getConsumeVerb(currentNotification.media_type || '')}`;
			}
			case 'update':
				return `hat ${mediaName} aktualisiert`;
			case 'delete':
				return `hat ${mediaName} gelöscht`;
			default:
				return 'hat eine Änderung vorgenommen';
		}
	}

	function getTimeAgo(dateString: string) {
		const date = new Date(dateString);
		const diffInSeconds = Math.floor((Date.now() - date.getTime()) / 1000);

		if (diffInSeconds < 60) return 'gerade eben';
		if (diffInSeconds < 3600) return `vor ${Math.floor(diffInSeconds / 60)}m`;
		if (diffInSeconds < 86400) return `vor ${Math.floor(diffInSeconds / 3600)}h`;
		return `vor ${Math.floor(diffInSeconds / 86400)}d`;
	}
</script>

<div
	class="flex w-full items-center gap-3 rounded-xl bg-base-200/70 px-3 py-2 transition hover:bg-base-200"
	role="button"
	tabindex="0"
	onclick={handleClick}
	onkeydown={(event) => event.key === 'Enter' && handleClick()}
>
	<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-base-300 text-lg">
		{#if notification.media_type}
			{getMediaTypeName(notification.media_type).slice(0, 1)}
		{:else}
			•
		{/if}
	</div>

	<div class="min-w-0 flex-1">
		<p class="text-sm">
			<span
				class="inline-block max-w-[50%] truncate align-bottom font-semibold"
				title={notification.username}>{notification.username}</span
			>
			<span class="text-neutral-400"> {getActivityText(notification)}</span>
		</p>
		{#if notification.media_title}
			<p class="mt-1 truncate text-sm text-neutral-500">{notification.media_title}</p>
		{/if}
		<p class="mt-1 text-xs text-neutral-500">{getTimeAgo(notification.created_at)}</p>
	</div>

	<div class="flex shrink-0 items-center gap-2">
		{#if notification.isUnread}
			<div class="h-2 w-2 rounded-full bg-info"></div>
		{/if}
		<button
			type="button"
			onclick={handleDismiss}
			disabled={isLoading}
			class="rounded-lg p-1 transition hover:bg-base-300 disabled:opacity-50"
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
