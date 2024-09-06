<!-- src/routes/+page.svelte -->
<script lang="ts">
	import { Auth } from '@supabase/auth-ui-svelte';
	import { ThemeSupa } from '@supabase/auth-ui-shared';

	export let data;
	let { supabase } = data;
	$: ({ supabase } = data);

	// listen to the auth signed_in event
	supabase.auth.onAuthStateChange((event) => {
		console.log(event);
		if (event === 'SIGNED_IN') {
			window.location.href = '/auth/username';
		}
	});
</script>

<svelte:head>
	<title>Media Logging Login</title>
</svelte:head>

<div class="flex flex-col text-center w-[80%] m-auto h-[100vh] justify-center">
	<img class="max-w-[30%] mx-auto" src="/icon-512x512.png" alt="Icon" />
	<Auth
		supabaseClient={supabase}
		view="sign_in"
		showLinks={true}
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
				sign_in: {
					button_label: 'Einloggen',
					email_input_placeholder: 'Deine E-Mail Adresse',
					email_label: 'E-Mail Adresse',
					password_input_placeholder: 'Dein Passwort',
					password_label: 'Passwort',
					link_text: 'Einloggen'
				},
				sign_up: {
					button_label: 'Registrieren',
					email_input_placeholder: 'Deine E-Mail Adresse',
					email_label: 'E-Mail Adresse',
					password_input_placeholder: 'Dein Passwort',
					password_label: 'Passwort',
					link_text: 'Noch keinen Account? Hier registrieren!'
				},
				forgotten_password: {
					email_label: 'E-mail Adresse',
					password_label: 'Dein Passwort',
					email_input_placeholder: 'Deine E-Mail Adresse',
					button_label: 'Über E-Mail einloggen',
					loading_button_label: 'Sende Login-Mail',
					link_text: 'Passwort vergessen?',
					confirmation_text:
						'Eine E-Mail mit einem Login-Link wurde versendet. Nutze diese Session, um dein Passwort in den Einstellungen zu aktualisieren'
				}
			}
		}}
	/>
</div>
