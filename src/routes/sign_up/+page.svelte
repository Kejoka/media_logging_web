<!-- src/routes/+page.svelte -->
<script lang="ts">
	import { Auth } from '@supabase/auth-ui-svelte';
	import { ThemeSupa, type Theme } from '@supabase/auth-ui-shared';
	import { supabase } from '$lib/supabaseClient.js';

	export let data;
	let email: string, username: string, password: string;

	async function handleSignUp() {
		await supabase.auth.signUp({
			email,
			password,
			options: {
				emailRedirectTo: `${data.url}/auth/callback`,
				data: {
					username
				}
			}
		});
	}
</script>

<svelte:head>
	<title>Registrieren</title>
</svelte:head>

<div class="flex flex-col text-center w-[80%] m-auto h-[100vh] justify-center">
	<!-- <form on:submit={handleSignUp}>
		<input type="text" />
		<input type="text" />
		<input type="text" />
		<button>Registrieren</button>
	</form> -->
	<Auth
		supabaseClient={data.supabase}
		view="sign_up"
		redirectTo={`${data.url}/auth/callback`}
		showLinks={false}
		appearance={{
			theme: ThemeSupa,
			variables: {
				default: {
					colors: {
						brand: 'oklch(var(--p))',
						brandAccent: 'oklch(var(--a))',
						brandButtonText: 'oklch(var(--ac))',
						inputBackground: 'oklch(var(--n))',
						inputText: 'oklch(var(--nc))',
						defaultButtonBackground: 'oklch(var(--n))',
						defaultButtonText: 'oklch(var(--nc))'
					}
				}
			}
		}}
		localization={{
			variables: {
				magic_link: {
					email_input_label: 'Email-Adresse',
					email_input_placeholder: 'Deine Email-Adresse',
					button_label: 'Einloggen',
					loading_button_label: '...',
					link_text: 'Magic Link senden',
					confirmation_text: 'Der Magic Link wurde gesendet'
				},
				sign_up: {
					social_provider_text: 'Einloggen mit {{provider}}'
				},
				sign_in: {
					social_provider_text: 'Einloggen mit {{provider}}'
				}
			}
		}}
	/>
</div>
