<!-- src/routes/+page.svelte -->
<script lang="ts">
	import { online_status } from '../stores/onlineStatus.js';
	$: is_online = $online_status;
	export let data;
	let { supabase } = data;
	$: ({ supabase } = data);

	// listen to the auth signed_in event
	supabase.auth.onAuthStateChange((event) => {
		// console.log(event);
		if (event === 'SIGNED_IN') {
			window.location.href = '/auth/username';
		}
	});
</script>

<svelte:head>
	<title>Media Logging Login</title>
</svelte:head>
