<script lang="ts">
	import { page } from '$app/state';

	const errorDescription = $derived(
		page.url.searchParams.get('error_description') ||
			page.url.hash
				?.split('&')
				?.find((p) => p.startsWith('error_description='))
				?.split('=')[1]
				?.replaceAll('+', ' ') ||
			'Der Link ist möglicherweise abgelaufen oder wurde bereits verwendet. Bitte versuche es erneut.'
	);
</script>

<svelte:head>
	<title>Authentifizierungsfehler</title>
</svelte:head>

<div class="flex min-h-[80vh] items-center justify-center px-4">
	<div class="w-full max-w-md">
		<div
			class="rounded-2xl border border-white/10 bg-white/5 p-8 text-center shadow-2xl backdrop-blur-sm"
		>
			<div
				class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-8 w-8 text-red-400"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					stroke-width="2"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
					/>
				</svg>
			</div>
			<h1 class="mb-2 text-2xl font-bold text-white">Authentifizierungsfehler</h1>
			<p class="mb-6 text-sm text-neutral-400">
				{errorDescription}
			</p>
			<div class="flex flex-col gap-3">
				<a
					href="/auth/forgot-password"
					class="inline-block rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500"
				>
					Fordere einen neuen Link zum Zurücksetzen an
				</a>
				<a
					href="/"
					class="inline-block rounded-lg border border-white/10 bg-white/5 px-6 py-2.5 text-sm font-medium text-neutral-300 transition hover:bg-white/10"
				>
					Zurück zur Anmeldung
				</a>
			</div>
		</div>
	</div>
</div>
