<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';

	let { data, form } = $props();
	let { session, supabase, profile } = $derived(data);
	let profileForm: HTMLFormElement;
	let loading = $state(false);
	let fullName = $derived(profile?.full_name ?? '');
	let username = $derived(profile?.username ?? '');
	let website = $derived(profile?.website ?? '');

	const handleSubmit: SubmitFunction = () => {
		loading = true;
		return async () => {
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
	<title>My Account</title>
</svelte:head>

<div class="flex min-h-[80vh] items-center justify-center px-4">
	<div class="w-full max-w-lg">
		<div class="rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-sm">
			<div class="mb-8 text-center">
				<h1 class="text-3xl font-bold tracking-tight text-white">My Account</h1>
				<p class="mt-2 text-sm text-neutral-400">Manage your profile information</p>
			</div>

			{#if form?.success}
				<div
					class="mb-6 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400"
				>
					Profile updated successfully!
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
						<label for="email" class="mb-1.5 block text-sm font-medium text-neutral-300"
							>Email</label
						>
						<input
							id="email"
							type="text"
							value={session.user.email}
							disabled
							class="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-neutral-500 transition"
						/>
					</div>

					<div>
						<label for="fullName" class="mb-1.5 block text-sm font-medium text-neutral-300"
							>Full Name</label
						>
						<input
							id="fullName"
							name="fullName"
							type="text"
							value={form?.fullName ?? fullName}
							placeholder="Your full name"
							class="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-neutral-500 transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
						/>
					</div>

					<div>
						<label for="username" class="mb-1.5 block text-sm font-medium text-neutral-300"
							>Username</label
						>
						<input
							id="username"
							name="username"
							type="text"
							value={form?.username ?? username}
							placeholder="your_username"
							class="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-neutral-500 transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
						/>
					</div>

					<div>
						<label for="website" class="mb-1.5 block text-sm font-medium text-neutral-300"
							>Website</label
						>
						<input
							id="website"
							name="website"
							type="url"
							value={form?.website ?? website}
							placeholder="https://example.com"
							class="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-neutral-500 transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
						/>
					</div>

					<button
						type="submit"
						disabled={loading}
						class="w-full cursor-pointer rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
					>
						{loading ? 'Saving...' : 'Update profile'}
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
						Sign out
					</button>
				</form>
			</div>
		</div>
	</div>
</div>
