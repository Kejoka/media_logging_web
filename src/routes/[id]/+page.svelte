<!-- src/routes/account/+page.svelte -->
<script lang="ts">
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

<div class="form-widget">
	<form
		class="form-widget"
		method="post"
		action="?/update"
		use:enhance={handleUpdate}
		bind:this={profileForm}
	>
		<div>
			<label for="email">Email</label>
			<input id="email" type="text" value={session.user.email} disabled />
		</div>

		<div>
			<label for="username">Username</label>
			<input id="username" name="username" type="text" value={form?.username ?? username} />
		</div>

		<div>
			<input
				type="submit"
				class="button block primary"
				value={loading ? 'Loading...' : 'Save Changes'}
				disabled={loading}
			/>
		</div>
	</form>

	<form method="post" action="?/signout" use:enhance={handleSignOut}>
		<div>
			<button class="button block" disabled={loading}>Sign Out</button>
		</div>
	</form>
	<button
		type="button"
		class="button block"
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
		type="button"
		class="button block"
		on:click={() => {
			if (profile.username == '') {
				alert('You need to choose a Username first');
				return;
			}
			goto(`${$page.url.pathname}/recommendations?profile=personal`);
		}}
	>
		Recommendations
	</button>
	<button
		type="button"
		class="button block"
		on:click={() => {
			if (profile.username == '') {
				alert('You need to choose a Username first');
				return;
			}
			handleProfileClear();
		}}
	>
		Delete Preference Profile
	</button>
</div>
