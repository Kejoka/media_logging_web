<script lang="ts">
	import { goto } from '$app/navigation';

	type NotificationItemType = {
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

	let { notification }: { notification: NotificationItemType } = $props();

	function handleClick() {
		goto(`/${notification.username}`);
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

		const mediaName = getMediaTypeName(notification.media_type || 'games');

		if (notification.activity_type === 'bulk_add') {
			const pluralNames: Record<string, string> = {
				games: 'Spiele',
				movies: 'Filme',
				shows: 'Serien',
				books: 'Bücher'
			};
			const plural = pluralNames[notification.media_type || 'games'] || 'Medien';
			return `hat ${notification.count} ${plural} hinzugefügt`;
		}

		switch (notification.activity_type) {
			case 'add':
				return `hat ${mediaName} hinzugefügt`;
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
			{:else if notification.media_image && notification.activity_type !== 'bulk_add'}
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
			{#if notification.media_title && notification.activity_type !== 'bulk_add'}
				<p class="mt-1 truncate text-sm text-neutral-500">
					{notification.media_title}
				</p>
			{/if}
			<p class="mt-1 text-xs text-neutral-500">
				{getTimeAgo(notification.created_at)}
			</p>
		</div>

		<!-- Unread indicator -->
		{#if notification.isUnread}
			<div class="shrink-0">
				<div class="h-2 w-2 rounded-full bg-info"></div>
			</div>
		{/if}
	</div>
</div>
