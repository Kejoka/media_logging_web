import { writable } from 'svelte/store';

export type ToastKind = 'error' | 'info' | 'success';

export type ToastMessage = {
	id: number;
	kind: ToastKind;
	message: string;
};

const AUTO_DISMISS_MS = 4500;

const { subscribe, update } = writable<ToastMessage[]>([]);

let nextToastId = 1;
const toastTimers = new Map<number, ReturnType<typeof setTimeout>>();

function removeToast(id: number) {
	const timer = toastTimers.get(id);
	if (timer) {
		clearTimeout(timer);
		toastTimers.delete(id);
	}
	update((messages) => messages.filter((toast) => toast.id !== id));
}

export const toastMessages = { subscribe };

export function pushToast(message: string, kind: ToastKind = 'error', timeoutMs = AUTO_DISMISS_MS) {
	const id = nextToastId++;
	update((messages) => [...messages, { id, kind, message }]);
	if (timeoutMs > 0) {
		const timer = setTimeout(() => removeToast(id), timeoutMs);
		toastTimers.set(id, timer);
	}
	return id;
}

export function dismissToast(id: number) {
	removeToast(id);
}
