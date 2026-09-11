<script lang="ts">
	import { enhance } from '$app/forms';
	import { MEDIA_TYPE_ORDER, normalize_enabled_media_types } from '$lib/utils';
	import ChangelogHistory from '$lib/UI/ChangelogHistory.svelte';
	import type { SubmitFunction } from '@sveltejs/kit';

	let { data, form } = $props();
	let { profile } = $derived(data);
	let profileForm: HTMLFormElement;
	let loading = $state(false);
	let username = $derived(profile?.username ?? '');
	let usernameInput = $state('');
	let selectedMediaTypes = $state<(typeof MEDIA_TYPE_ORDER)[number][]>([]);

	$effect(() => {
		const fallback_username = profile?.username ?? '';
		usernameInput =
			typeof form?.username === 'string' && form.username.trim().length > 0
				? form.username
				: fallback_username;

		const fallback_media_types = normalize_enabled_media_types(
			profile?.enabled_media_types ?? null
		);
		selectedMediaTypes =
			form?.enabled_media_types && form.enabled_media_types.length > 0
				? [...form.enabled_media_types]
				: [...fallback_media_types];
	});

	const MEDIA_TYPE_LABELS: Record<(typeof MEDIA_TYPE_ORDER)[number], string> = {
		games: 'Games',
		movies: 'Filme',
		shows: 'Serien',
		books: 'Bücher'
	};

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

<div class="scrollbar-hide flex w-full flex-1 items-start justify-center overflow-y-auto px-4 py-8">
	<div class="w-full max-w-lg">
		<div class="mb-8 text-center">
			<h1
				title={(usernameInput || username) + "'s" || 'Dein'}
				class="truncate text-3xl font-bold tracking-tight text-white"
			>
				{(usernameInput || username) + "'s" || 'Dein'} Account
			</h1>
			<p class="mt-2 text-sm text-neutral-400">Profilverwaltung</p>
		</div>

		{#if form?.success}
			<div class="ml-alert-success mb-6 rounded-lg px-4 py-3 text-sm">
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
						bind:value={usernameInput}
						placeholder="Neuer Benutzername..."
						minlength={3}
						pattern="^[A-Za-z0-9_]+$"
						oninput={(e) =>
							(e.currentTarget.value = e.currentTarget.value.replace(/[^A-Za-z0-9_]/g, ''))}
						class="ml-focus w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-neutral-500 transition"
					/>
				</div>

				<div class="rounded-lg border border-white/10 bg-white/5 p-4">
					<p class="mb-1 text-sm font-medium text-neutral-300">Sichtbare Medientypen</p>
					<p class="mb-3 text-xs text-neutral-500">Mindestens ein Typ muss aktiv sein</p>
					<div class="grid grid-cols-2 gap-2">
						{#each MEDIA_TYPE_ORDER as mediaType (mediaType)}
							<label
								class="ml-focus flex cursor-pointer items-center justify-between rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-neutral-200 transition hover:bg-white/10"
							>
								<span>{MEDIA_TYPE_LABELS[mediaType]}</span>
								<input
									type="checkbox"
									name="enabled_media_types"
									value={mediaType}
									class="checkbox checkbox-sm"
									bind:group={selectedMediaTypes}
								/>
							</label>
						{/each}
					</div>
				</div>

				<button
					type="submit"
					disabled={loading}
					class="ml-action-positive ml-focus w-full cursor-pointer rounded-lg px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
				>
					{loading ? 'Speichern...' : 'Daten aktualisieren'}
				</button>
			</div>
		</form>

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

			<div class="mt-3">
				<ChangelogHistory />
			</div>
		</div>
	</div>
</div>
