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
	<title>Passwort aktualisieren</title>
</svelte:head>

<div class="flex min-h-[80vh] items-center justify-center px-4">
	<div class="w-full max-w-md">
		<div class="rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-sm">
			<div class="mb-8 text-center">
				<h1 class="text-3xl font-bold tracking-tight text-white">Neues Passwort festlegen</h1>
				<p class="mt-2 text-sm text-neutral-400">Wähle ein sicheres Passwort für dein Konto</p>
			</div>

			{#if form?.success}
				<div
					class="mb-6 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400"
				>
					{form.message}
				</div>
				<a
					href="/account"
					class="mt-4 block w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-emerald-500"
				>
					Gehe zu deinem Konto
				</a>
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
							<label for="password" class="mb-1.5 block text-sm font-medium text-neutral-300"
								>New password</label
							>
							<input
								id="password"
								name="password"
								type="password"
								autocomplete="new-password"
								required
								minlength={8}
								placeholder="••••••••"
								class="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-neutral-500 transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
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
								class="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-neutral-500 transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
							/>
						</div>

						<button
							type="submit"
							disabled={loading}
							class="w-full cursor-pointer rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
						>
							{loading ? 'Aktualisiere...' : 'Passwort aktualisieren'}
						</button>
					</div>
				</form>
			{/if}
		</div>
	</div>
</div>
