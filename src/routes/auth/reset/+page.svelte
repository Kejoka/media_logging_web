<script lang="ts">
	import { fade } from 'svelte/transition';
	import { Auth } from '@supabase/auth-ui-svelte';
	import { ThemeSupa } from '@supabase/auth-ui-shared';
	import NavBar from '$lib/UI/navBar.svelte';

	export let data;
	let { supabase } = data;
	$: ({ supabase } = data);

	let loading = false;
	let displaying_error = false;
	let error_message: string;

	// listen to the auth signed_in event
	supabase.auth.onAuthStateChange((event) => {
		console.log(event);
		if (event === 'USER_UPDATED') {
			window.location.href = '/';
		}
	});
</script>

<svelte:head>
	<title>Passwort-Reset</title>
</svelte:head>

<div class="flex flex-col h-screen bg-base-200">
	<NavBar
		header={'Passwort'}
		settings_button={false}
		nav_back_button={true}
		static_header={true}
		own_profile={undefined}
	></NavBar>
	<div class="flex flex-col text-center m-auto w-[80%] justify-center">
		<img class="max-w-[30%] mx-auto" src="/icon-512x512.png" alt="Icon" />

		<Auth
			supabaseClient={supabase}
			view="update_password"
			showLinks={false}
			appearance={{
				theme: ThemeSupa,
				variables: {
					default: {
						colors: {
							inputBackground: 'oklch(var(--b2))',
							inputText: 'oklch(var(--bc))'
						}
					}
				}
			}}
			localization={{
				variables: {
					update_password: {
						button_label: 'Passwort ändern',
						loading_button_label: 'Passwort wird geändert...',
						password_input_placeholder: 'Dein neues Passwort',
						password_label: 'Neues Passwort'
					}
				}
			}}
		/>
	</div>
	{#if displaying_error}
		<div class="toast toast-top toast-center" transition:fade={{ delay: 250, duration: 300 }}>
			<div class="alert alert-error">
				<span>{error_message}</span>
			</div>
		</div>
	{/if}
</div>
