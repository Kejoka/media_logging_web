<!-- src/routes/account/+page.svelte -->
<script lang="ts">
	import { fade } from 'svelte/transition';
	import NavBar from '$lib/UI/navBar.svelte';
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { supabase } from '$lib/supabaseClient.js';
	import AutoComplete from '$lib/UI/AutoComplete.svelte';

	export let data;
	export let form;

	let { session, profile } = data;
	$: ({ session, profile } = data);

	let profileForm: HTMLFormElement;
	let loading = false;
	let username: string = profile?.username ?? '';
	let displaying_error = false;
	let error_message: string;

	const handleUpdate: SubmitFunction = () => {
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

	const handleProfileClear = async () => {
		const pref_id = await supabase
			.from('preference_profiles')
			.select('id')
			.eq('user_id', session.user.id)
			.single();
		const res = await supabase
			.from('preferences')
			.delete()
			.eq('user_preference_id', pref_id.data?.id)
			.select();
		displaying_error = true;
		error_message = `${res.data?.length} MovieSwiper Präferenzen wurden gelöscht`;
		setTimeout(() => {
			displaying_error = false;
		}, 4000);
	};
</script>

<svelte:head>
	<title>Profile Settings</title>
</svelte:head>

<div class="h-full bg-base-100">
	<NavBar
		header={'Nutzereinstellungen'}
		settingsButton={false}
		navBackButton={true}
		staticHeader={true}
		own_profile={undefined}
	></NavBar>
	<div class="w-[90%] flex flex-col justify-center items-center mx-auto">
		<AutoComplete></AutoComplete>
		<form
			class="my-3 w-[75%] text-center"
			method="post"
			action="?/update"
			use:enhance={handleUpdate}
			bind:this={profileForm}
		>
			<label class="input input-bordered flex items-center gap-2 mb-3">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 16 16"
					fill="currentColor"
					class="h-4 w-4 opacity-70"
				>
					<path
						d="M2.5 3A1.5 1.5 0 0 0 1 4.5v.793c.026.009.051.02.076.032L7.674 8.51c.206.1.446.1.652 0l6.598-3.185A.755.755 0 0 1 15 5.293V4.5A1.5 1.5 0 0 0 13.5 3h-11Z"
					/>
					<path
						d="M15 6.954 8.978 9.86a2.25 2.25 0 0 1-1.956 0L1 6.954V11.5A1.5 1.5 0 0 0 2.5 13h11a1.5 1.5 0 0 0 1.5-1.5V6.954Z"
					/>
				</svg>
				<input type="text" class="grow" placeholder="Email" value={session.user.email} disabled />
			</label>

			<label class="input input-bordered flex items-center gap-2 mb-3">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 16 16"
					fill="currentColor"
					class="h-4 w-4 opacity-70"
				>
					<path
						d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM12.735 14c.618 0 1.093-.561.872-1.139a6.002 6.002 0 0 0-11.215 0c-.22.578.254 1.139.872 1.139h9.47Z"
					/>
				</svg>
				<input
					id="username"
					name="username"
					type="text"
					class="grow"
					placeholder="Username"
					value={form?.username ?? username}
				/>
			</label>

			<input
				class="btn btn-neutral-content w-full"
				type="submit"
				value={loading ? 'lädt...' : 'Änderungen speichern'}
				disabled={loading}
			/>
		</form>

		<form class="mb-3 w-[75%]" method="post" action="?/signout" use:enhance={handleSignOut}>
			<div>
				<button class="btn btn-neutral-content w-full" disabled={loading}>Abmelden</button>
			</div>
		</form>
		<button
			class="btn btn-neutral-content mb-3 w-[75%]"
			disabled={loading}
			type="button"
			on:click={() => {
				if (profile.username == '') {
					alert('You need to choose a Username first');
					return;
				}
				goto(`${$page.url.pathname}/movieswiper?profile=personal`);
			}}
		>
			MovieSwiper
		</button>
		<button
			class="btn btn-neutral-content mb-3 w-[75%]"
			disabled={loading}
			type="button"
			on:click={() => {
				if (profile.username == '') {
					alert('You need to choose a Username first');
					return;
				}
				goto(`${$page.url.pathname}/recommendations?profile=personal`);
			}}
		>
			Film-Empfehlungen
		</button>
		<button
			class="btn btn-neutral-content mb-3 w-[75%]"
			disabled={loading}
			type="button"
			on:click={() => {
				if (profile.username == '') {
					alert('You need to choose a Username first');
					return;
				}
				handleProfileClear();
			}}
		>
			MovieSwiper Präferenzen löschen
		</button>
		<button
			class="btn btn-neutral-content mb-3 w-[75%]"
			disabled={loading}
			type="button"
			on:click={() => {
				goto($page.url.origin + '/auth/reset');
			}}
		>
			Passwort ändern
		</button>
	</div>
</div>
{#if displaying_error}
	<div class="toast toast-bottom toast-center" transition:fade={{ delay: 250, duration: 300 }}>
		<div class="alert alert-warning">
			<span>{error_message}</span>
		</div>
	</div>
{/if}
