<script lang="ts">
	import { goto } from '$app/navigation';
	import UserFollow from '$lib/Icons/user_follow.svelte';
	import UserUnfollow from '$lib/Icons/user_unfollow.svelte';
	import { onMount } from 'svelte';

	let { isOpen = $bindable(false) }: { isOpen?: boolean } = $props();

	type FollowUser = {
		username: string;
		isFollowing: boolean;
	};

	let followingUsers: FollowUser[] = $state([]);
	let followerUsers: FollowUser[] = $state([]);
	let searchResults: FollowUser[] = $state([]);
	let loading: boolean = $state(false);
	let searchLoading: boolean = $state(false);
	let error: string | null = $state(null);
	let searchError: string | null = $state(null);
	let searchValue = $state('');
	let searchTimeout: ReturnType<typeof setTimeout> | null = null;
	let searchRequestId = 0;

	onMount(() => {
		return () => {
			if (searchTimeout) {
				clearTimeout(searchTimeout);
			}
		};
	});

	$effect(() => {
		if (isOpen) {
			void loadRelations();
		}
	});

	async function loadRelations() {
		loading = true;
		error = null;
		try {
			const res = await fetch('/api/v1/getFollowRelations', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				}
			});

			if (!res.ok) {
				throw new Error('Failed to load follow data');
			}

			const data = (await res.json()) as {
				following: FollowUser[];
				followers: FollowUser[];
			};

			followingUsers = data.following || [];
			followerUsers = data.followers || [];
		} catch (err) {
			console.error('Error loading follow relations:', err);
			error = 'Follower konnten nicht geladen werden';
		} finally {
			loading = false;
		}
	}

	async function runSearch(value: string) {
		const trimmed = value.trim();
		if (trimmed.length === 0) {
			searchResults = [];
			searchError = null;
			searchLoading = false;
			return;
		}

		const currentRequestId = ++searchRequestId;
		searchLoading = true;
		searchError = null;

		try {
			const res = await fetch('/api/v1/searchUsers', {
				method: 'POST',
				body: JSON.stringify({ search_val: trimmed }),
				headers: {
					'Content-Type': 'application/json'
				}
			});

			if (!res.ok) {
				throw new Error('Failed to search users');
			}

			const data = (await res.json()) as FollowUser[];
			if (currentRequestId !== searchRequestId) return;
			searchResults = data || [];
		} catch (err) {
			if (currentRequestId !== searchRequestId) return;
			console.error('Error searching users:', err);
			searchError = 'Suche konnte nicht geladen werden';
			searchResults = [];
		} finally {
			if (currentRequestId === searchRequestId) {
				searchLoading = false;
			}
		}
	}

	function handleSearchInput(event: Event) {
		const target = event.currentTarget as HTMLInputElement | null;
		searchValue = target?.value ?? '';

		if (searchTimeout) {
			clearTimeout(searchTimeout);
		}

		searchTimeout = setTimeout(() => {
			void runSearch(searchValue);
		}, 350);
	}

	async function handleFollowToggle(username: string) {
		try {
			const res = await fetch('/api/v1/followUser', {
				method: 'POST',
				body: JSON.stringify({ followee: username }),
				headers: {
					'Content-Type': 'application/json'
				}
			});

			if (!res.ok) {
				throw new Error('Failed to toggle follow state');
			}

			await loadRelations();
			if (searchValue.trim().length > 0) {
				await runSearch(searchValue);
			}
		} catch (err) {
			console.error('Error toggling follow state:', err);
			error = 'Follower-Aktion konnte nicht ausgeführt werden';
		}
	}

	function openProfile(username: string) {
		isOpen = false;
		goto(`/${username}`);
	}

	function closePanel() {
		isOpen = false;
	}

	function renderActionButton(user: FollowUser) {
		return user.isFollowing ? 'Entfolgen' : 'Folgen';
	}

	function renderSectionEmptyText(title: string) {
		return title;
	}
</script>

{#if isOpen}
	<div
		class="fixed inset-0 z-40 bg-black/20"
		onclick={closePanel}
		onkeydown={(e) => e.key === 'Escape' && closePanel()}
		role="button"
		tabindex="0"
		aria-label="Close followers panel"
	></div>
{/if}

<div
	class="fixed top-14 right-4 z-50 w-96 max-w-[calc(100vw-2rem)] transition-all duration-300 {isOpen
		? 'translate-x-0 opacity-100'
		: 'pointer-events-none translate-x-full opacity-0'}"
>
	<div class="flex max-h-[calc(100vh-5rem)] flex-col rounded-lg bg-base-300 shadow-2xl">
		<div class="flex items-center justify-between border-b border-base-100 px-4 py-3">
			<div>
				<h2 class="text-lg font-semibold">Community</h2>
			</div>
			<button
				onclick={closePanel}
				class="rounded-lg p-1 transition hover:bg-base-200"
				aria-label="Close"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-5 w-5"
					viewBox="0 0 20 20"
					fill="currentColor"
				>
					<path
						fill-rule="evenodd"
						d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
						clip-rule="evenodd"
					/>
				</svg>
			</button>
		</div>

		<div class="scrollbar-hide flex-1 overflow-y-auto p-4">
			<div class="space-y-5">
				<div class="space-y-2">
					<label for="follower-search" class="block text-sm font-medium text-neutral-300"
						>Nutzer suchen</label
					>
					<div class="relative">
						<input
							id="follower-search"
							type="text"
							class="ml-focus w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 pr-10 text-sm text-white placeholder-neutral-500 transition"
							placeholder="Andere Nutzer finden..."
							bind:value={searchValue}
							oninput={handleSearchInput}
						/>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 16 16"
							fill="currentColor"
							class="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-neutral-400"
						>
							<path
								fill-rule="evenodd"
								d="M9.965 11.026a5 5 0 1 1 1.06-1.06l2.755 2.754a.75.75 0 1 1-1.06 1.06l-2.755-2.754ZM10.5 7a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z"
								clip-rule="evenodd"
							/>
						</svg>
					</div>
					{#if searchLoading}
						<p class="text-xs text-neutral-400">Suche...</p>
					{:else if searchError}
						<p class="text-xs text-error">{searchError}</p>
					{:else if searchResults.length > 0}
						<div
							class="mt-2 divide-y divide-base-100 overflow-hidden rounded-lg border border-white/10 bg-white/5"
						>
							{#each searchResults as user (user.username)}
								<div class="flex items-center justify-between gap-3 px-3 py-2.5">
									<button
										type="button"
										class="min-w-0 flex-1 text-left text-sm text-neutral-100 transition hover:text-white"
										onclick={() => openProfile(user.username)}
									>
										<span class="truncate">{user.username}</span>
									</button>
									<button
										type="button"
										class="btn btn-circle h-8 w-12 shrink-0"
										onclick={() => void handleFollowToggle(user.username)}
									>
										{#if renderActionButton(user) === 'Folgen'}
											<UserFollow />
										{:else}
											<UserUnfollow />
										{/if}
									</button>
								</div>
							{/each}
						</div>
					{:else if searchValue.trim().length > 0}
						<p class="text-xs text-neutral-400">Keine Nutzer gefunden.</p>
					{/if}
				</div>

				<div class="space-y-2">
					<div class="flex items-center justify-between">
						<h3 class="text-sm font-semibold text-white">Deine Follows</h3>
						<span class="text-xs text-neutral-400">{followingUsers.length}</span>
					</div>
					{#if loading && followingUsers.length === 0}
						<p class="text-xs text-neutral-400">Lade Liste...</p>
					{:else if error}
						<p class="text-xs text-error">{error}</p>
					{:else if followingUsers.length === 0}
						<p class="text-xs text-neutral-400">
							{renderSectionEmptyText('Du folgst noch niemandem.')}
						</p>
					{:else}
						<div
							class="divide-y divide-base-100 overflow-hidden rounded-lg border border-white/10 bg-white/5"
						>
							{#each followingUsers as user (user.username)}
								<div class="flex items-center justify-between gap-3 px-3 py-2.5">
									<button
										type="button"
										class="min-w-0 flex-1 text-left text-sm text-neutral-100 transition hover:text-white"
										onclick={() => openProfile(user.username)}
									>
										<span class="truncate">{user.username}</span>
									</button>
									<button
										type="button"
										class="btn btn-circle h-8 w-12 shrink-0"
										onclick={() => void handleFollowToggle(user.username)}
									>
										{#if renderActionButton(user) === 'Folgen'}
											<UserFollow />
										{:else}
											<UserUnfollow />
										{/if}
									</button>
								</div>
							{/each}
						</div>
					{/if}
				</div>

				<div class="space-y-2">
					<div class="flex items-center justify-between">
						<h3 class="text-sm font-semibold text-white">Meine Follower</h3>
						<span class="text-xs text-neutral-400">{followerUsers.length}</span>
					</div>
					{#if loading && followerUsers.length === 0}
						<p class="text-xs text-neutral-400">Lade Liste...</p>
					{:else if error}
						<p class="text-xs text-error">{error}</p>
					{:else if followerUsers.length === 0}
						<p class="text-xs text-neutral-400">Dir folgt aktuell niemand.</p>
					{:else}
						<div
							class="divide-y divide-base-100 overflow-hidden rounded-lg border border-white/10 bg-white/5"
						>
							{#each followerUsers as user (user.username)}
								<div class="flex items-center justify-between gap-3 px-3 py-2.5">
									<button
										type="button"
										class="min-w-0 flex-1 text-left text-sm text-neutral-100 transition hover:text-white"
										onclick={() => openProfile(user.username)}
									>
										<span class="truncate">{user.username}</span>
									</button>
									<button
										type="button"
										class="btn btn-circle h-8 w-12 shrink-0"
										onclick={() => void handleFollowToggle(user.username)}
									>
										{#if renderActionButton(user) === 'Folgen'}
											<UserFollow />
										{:else}
											<UserUnfollow />
										{/if}
									</button>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			</div>
		</div>
	</div>
</div>
