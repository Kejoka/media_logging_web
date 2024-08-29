import { writable } from 'svelte/store';

const isClient = typeof window !== 'undefined'; // Überprüfen, ob der Code im Browser läuft

export const onlineStatus = writable(isClient ? navigator.onLine : true); // Standardmäßig 'true', wenn auf dem Server

if (isClient) {
    function updateOnlineStatus() {
        onlineStatus.set(navigator.onLine);
    }

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
}
