<!-- src/routes/+page.svelte -->
<script lang="ts">
	import { Auth } from '@supabase/auth-ui-svelte';
	import { ThemeSupa } from '@supabase/auth-ui-shared';
	import { onMount } from 'svelte';

	export let data;
	const checkIsDarkSchemePreferred = () =>
		window?.matchMedia?.('(prefers-color-scheme:dark)')?.matches ?? false;
	let theme: string;
	onMount(() => {
		const userPrefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
		if (userPrefersDarkMode) {
			theme = 'dark';
		} else {
			theme = 'light';
		}
	});
</script>

<svelte:head>
	<title>Media Logging Login</title>
</svelte:head>

<div class="row flex-center flex justify-center">
	<div class="col-6 form-widget">
		<Auth
			supabaseClient={data.supabase}
			view="magic_link"
			redirectTo={`${data.url}/auth/callback`}
			showLinks={false}
			appearance={{ theme: ThemeSupa }}
			{theme}
		/>
	</div>
</div>
