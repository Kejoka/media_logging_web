<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types.js';
	import { online_status } from '../stores/onlineStatus.js';
	let is_online = $derived($online_status);

	interface Props {
		form: ActionData;
	}
	let { form }: Props = $props();

	let loading = $state(false);
</script>

<svelte:head>
	<title>Media Logging Login</title>
</svelte:head>

<div class="flex h-full items-center justify-center px-4">
	{#if is_online}
		<div class="w-full max-w-md">
			<div class="rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-sm">
				<img class="mx-auto max-w-[30%]" src="/icon-512x512.png" alt="Icon" />
				<div class="mb-8 text-center">
					<h1 class="text-3xl font-bold tracking-tight text-white">Willkommen</h1>
					<p class="mt-2 text-sm text-neutral-400">Melde dich an, um fortzufahren</p>
				</div>

				{#if form?.error}
					<div
						class="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400"
					>
						{form.error}
					</div>
				{/if}

				<form
					method="POST"
					action="?/login"
					use:enhance={() => {
						loading = true;
						return async ({ update }) => {
							await update();
							loading = false;
						};
					}}
				>
					<div class="space-y-5">
						<div>
							<label for="email" class="mb-1.5 block text-sm font-medium text-neutral-300"
								>E-Mail Adresse</label
							>
							<input
								id="email"
								name="email"
								type="email"
								autocomplete="email"
								required
								placeholder="Deine E-Mail Adresse..."
								value={form?.email ?? ''}
								class="ml-focus w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-neutral-500 transition"
							/>
						</div>

						<div>
							<div class="mb-1.5 flex items-center justify-between">
								<label for="password" class="block text-sm font-medium text-neutral-300"
									>Passwort</label
								>
								<a
									href="/auth/forgot-password"
									class="ml-link-accent text-sm transition"
									>Passwort vergessen?</a
								>
							</div>
							<input
								id="password"
								name="password"
								type="password"
								autocomplete="current-password"
								required
								placeholder="••••••••"
								class="ml-focus w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-neutral-500 transition"
							/>
						</div>

						<button
							type="submit"
							disabled={loading}
							class="ml-action-positive ml-focus w-full cursor-pointer rounded-lg px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
						>
							{loading ? 'Anmelden...' : 'Anmelden'}
						</button>
					</div>
				</form>

				<p class="mt-6 text-center text-sm text-neutral-400">
					Noch keinen Account?
					<a
						href="/auth/signup"
						class="ml-link-accent font-medium transition">Registrieren</a
					>
				</p>
			</div>
		</div>
	{:else}
		<div class="mx-5 flex h-full flex-col justify-center text-center align-middle">
			<img class="mx-auto max-w-[30%]" src="/icon-512x512.png" alt="Icon" />
			<p class="mb-3 text-2xl">Du bist aktuell Offline</p>
			<p class="text-lg">
				Stelle eine Verbindung mit dem Internet her, um eine Session zu erstellen
			</p>
		</div>
	{/if}
</div>
