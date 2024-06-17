<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { redirect, type SubmitFunction } from '@sveltejs/kit';
	export let data;
	export let form;
	let { session, profile } = data;
	$: ({ session, profile } = data);
	let username: string = profile?.username ?? '';
	let loading = false;

	const handleUpdate: SubmitFunction = () => {
		loading = true;
		return async () => {
			loading = false;
			goto('/username');
		};
	};
</script>

<div class="form-widget">
	<form class="form-widget" method="post" action="?/update" use:enhance={handleUpdate}>
		<p class="text-center text-md">You must choose a username to be able use Media Logging</p>
		<p class="text-center text-sm">Refresh this page afterwards</p>
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
</div>
