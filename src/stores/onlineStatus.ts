import { writable } from 'svelte/store';

const is_client = typeof window !== 'undefined';

export const online_status = writable(is_client ? navigator.onLine : true);

if (is_client) {
	function updateOnlineStatus() {
		online_status.set(navigator.onLine);
	}

	window.addEventListener('online', updateOnlineStatus);
	window.addEventListener('offline', updateOnlineStatus);
}
