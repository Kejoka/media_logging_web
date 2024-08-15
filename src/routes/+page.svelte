<!-- src/routes/+page.svelte -->
<script lang="ts">
	import { Auth } from '@supabase/auth-ui-svelte';
	import { ThemeSupa, type Theme } from '@supabase/auth-ui-shared';
	import { goto } from '$app/navigation';

	export let data;
</script>

<svelte:head>
	<title>Media Logging Login</title>
</svelte:head>

<div class="flex flex-col text-center w-[80%] m-auto h-[100vh] justify-center">
	<Auth
		supabaseClient={data.supabase}
		view="sign_in"
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
				sign_in: {
					button_label: 'Einloggen'
				}
			}
		}}
	/>
	<button
		class="btn btn-accent"
		on:click={() => {
			goto('/sign_up');
		}}
	>
		Registrieren
	</button>
</div>
