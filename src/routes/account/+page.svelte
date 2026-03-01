<script lang="ts">
	import { enhance } from '$app/forms';
	import AutoComplete from '$lib/UI/AutoComplete.svelte';
	import type { SubmitFunction } from '@sveltejs/kit';

	let { data, form } = $props();
	let { session, supabase, profile } = $derived(data);
	let profileForm: HTMLFormElement;
	let loading = $state(false);
	let username = $derived(profile?.username ?? '');

	const handleSubmit: SubmitFunction = () => {
		loading = true;
		return async ({ update }) => {
			await update();
			loading = false;
		};
	};

	const handleSignOut: SubmitFunction = () => {
		loading = true;
		return async ({ update }) => {
			loading = false;
			update();
		};
	};
</script>

<svelte:head>
	<title>Mein Account</title>
</svelte:head>

<div class="flex w-full flex-1 items-start justify-center overflow-y-auto px-4 py-8">
	<div class="w-full max-w-lg">
		<div class="mb-8 text-center">
			<h1 class="text-3xl font-bold tracking-tight text-white">
				{username + "'s" || 'Dein'} Account
			</h1>
			<p class="mt-2 text-sm text-neutral-400">Profilverwaltung</p>
		</div>

		{#if form?.success}
			<div
				class="mb-6 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400"
			>
				Profil erfolgreich aktualisiert!
			</div>
		{/if}

		{#if form?.error}
			<div
				class="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400"
			>
				{form.error}
			</div>
		{/if}

		<form method="post" action="?/update" use:enhance={handleSubmit} bind:this={profileForm}>
			<div class="space-y-5">
				<div>
					<label for="username" class="mb-1.5 block text-sm font-medium text-neutral-300"
						>Benutzername</label
					>
					<input
						id="username"
						name="username"
						type="text"
						value={form?.username ?? username}
						placeholder="Neuer Benutzername..."
						minlength={3}
						pattern="^[A-Za-z0-9_]+$"
						oninput={(e) =>
							(e.currentTarget.value = e.currentTarget.value.replace(/[^A-Za-z0-9_]/g, ''))}
						class="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-neutral-500 transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
					/>
				</div>
				<button
					type="submit"
					disabled={loading}
					class="w-full cursor-pointer rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
				>
					{loading ? 'Speichern...' : 'Daten aktualisieren'}
				</button>
			</div>
		</form>

		<div class="my-6 border-t border-white/10"></div>

		<div class="space-y-3">
			<label for="user-search" class="mb-1.5 block text-sm font-medium text-neutral-300"
				>Andere Nutzer finden</label
			>
			<p class="text-xs text-neutral-500">Suche nach Profilen anderer Nutzer</p>
			<AutoComplete></AutoComplete>
		</div>

		<div class="mt-6 border-t border-white/10 pt-6">
			<form method="post" action="?/signout" use:enhance={handleSignOut}>
				<button
					type="submit"
					disabled={loading}
					class="w-full cursor-pointer rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-neutral-300 transition hover:bg-white/10 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
				>
					Abmelden
				</button>
			</form>
		</div>
	</div>
</div>
