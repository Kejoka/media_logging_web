<!-- src/routes/account/+page.svelte -->
<script lang="ts">
	import NavBar from './../../../lib/UI/navBar.svelte';
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { supabase } from '$lib/supabaseClient.js';

	export let data;
	export let form;

	let { session, profile } = data;
	$: ({ session, profile } = data);

	let profileForm: HTMLFormElement;
	let loading = false;
	let username: string = profile?.username ?? '';

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
		alert(`${res.data?.length} profile preferences have been deleted from the database`);
	};
</script>

<svelte:head>
	<title>Profile Settings</title>
</svelte:head>

<div>
	<NavBar header={'Nutzereinstellungen'} settingsButton={false} navBackButton={true}></NavBar>
	<div class="w-[90%] flex flex-col justify-center items-center mx-auto">
		<form
			class="my-3 w-[75%] text-center"
			method="post"
			action="?/update"
			use:enhance={handleUpdate}
			bind:this={profileForm}
		>
			<div class="mb-3 w-full">
				<label for="email">Email</label>
				<input id="email" type="text" value={session.user.email} disabled />
			</div>

			<div class="mb-3 w-full">
				<label for="username">Username</label>
				<input id="username" name="username" type="text" value={form?.username ?? username} />
			</div>

			<input
				class="btn btn-neutral w-full"
				type="submit"
				value={loading ? 'lädt...' : 'Änderungen speichern'}
				disabled={loading}
			/>
		</form>

		<form class="mb-3 w-[75%]" method="post" action="?/signout" use:enhance={handleSignOut}>
			<div>
				<button class="btn btn-neutral w-full" disabled={loading}>Abmelden</button>
			</div>
		</form>
		<button
			class="btn btn-neutral mb-3 w-[75%]"
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
			class="btn btn-neutral mb-3 w-[75%]"
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
			class="btn btn-neutral mb-3 w-[75%]"
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
	</div>
</div>
