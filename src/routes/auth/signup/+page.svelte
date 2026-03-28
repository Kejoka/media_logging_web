<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types.js';

	interface Props {
		form: ActionData;
	}
	let { form }: Props = $props();

	let loading = $state(false);
</script>

<svelte:head>
	<title>Registrieren</title>
</svelte:head>

<div class="flex min-h-[80vh] items-center justify-center px-4">
	<div class="w-full max-w-md">
		<div class="rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-sm">
			<div class="mb-8 text-center">
				<h1 class="text-3xl font-bold tracking-tight text-white">Registrieren</h1>
				<p class="mt-2 text-sm text-neutral-400">Erstelle dein neues Konto</p>
			</div>

			{#if form?.success}
				<div class="ml-alert-success mb-6 rounded-lg px-4 py-3 text-sm">
					{form.message}
				</div>
			{:else}
				{#if form?.error}
					<div
						class="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400"
					>
						{form.error}
					</div>
				{/if}

				<form
					method="POST"
					action="?/signup"
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
							<label for="username" class="mb-1.5 block text-sm font-medium text-neutral-300"
								>Benutzername</label
							>
							<input
								id="username"
								name="username"
								type="text"
								autocomplete="username"
								required
								minlength={3}
								pattern="^[A-Za-z0-9_]+$"
								placeholder="Dein Benutzername..."
								value={form?.username ?? ''}
								oninput={(e) =>
									(e.currentTarget.value = e.currentTarget.value.replace(/[^A-Za-z0-9_]/g, ''))}
								class="ml-focus w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-neutral-500 transition"
							/>
							<p class="mt-1 text-xs text-neutral-500">
								Nur Buchstaben, Zahlen und Unterstriche erlaubt
							</p>
						</div>

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
							<label for="password" class="mb-1.5 block text-sm font-medium text-neutral-300"
								>Passwort</label
							>
							<input
								id="password"
								name="password"
								type="password"
								autocomplete="new-password"
								required
								minlength={8}
								placeholder="••••••••"
								class="ml-focus w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-neutral-500 transition"
							/>
							<p class="mt-1 text-xs text-neutral-500">Mindestens 8 Zeichen</p>
						</div>

						<div>
							<label for="confirmPassword" class="mb-1.5 block text-sm font-medium text-neutral-300"
								>Passwort bestätigen</label
							>
							<input
								id="confirmPassword"
								name="confirmPassword"
								type="password"
								autocomplete="new-password"
								required
								minlength={8}
								placeholder="••••••••"
								class="ml-focus w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-neutral-500 transition"
							/>
						</div>

						<button
							type="submit"
							disabled={loading}
							class="ml-action-positive ml-focus w-full cursor-pointer rounded-lg px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
						>
							{loading ? 'Konto wird erstellt...' : 'Konto erstellen'}
						</button>
					</div>
				</form>
			{/if}

			<p class="mt-6 text-center text-sm text-neutral-400">
				Hast du bereits ein Konto?
				<a href="/" class="ml-link-accent font-medium transition"
					>Anmelden</a
				>
			</p>
		</div>
	</div>
</div>
