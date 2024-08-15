<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { type SubmitFunction } from '@sveltejs/kit';
	export let data;
	export let form;
	let { profile } = data;
	$: ({ profile } = data);
	let username: string = profile?.username ?? '';
	let loading = false;

	const handleUpdate: SubmitFunction = () => {
		loading = true;
		return (res) => {
			loading = false;
			console.log(res.result);
			if (res.result.type === 'success') {
				goto(`/${res.result.data?.username}`);
			}
		};
	};
</script>

<svelte:head>
	<title>Nutzername</title>
</svelte:head>

<div class="flex flex-col h-[100vh] justify-center">
	<form class=" text-center" method="post" action="?/update" use:enhance={handleUpdate}>
		<p class="text-center text-md font-bold my-3">Wilkommen! Bitte wähle einen Nutzername</p>
		<div>
			<label for="username" class=" font-semibold">Username: </label>
			<input
				id="username"
				name="username"
				type="text"
				class="input-sm mb-3"
				value={form?.username ?? username}
			/>
		</div>

		<div>
			<input
				type="submit"
				class="btn btn-primary"
				value={loading ? 'Loading...' : 'Username überprüfen'}
				disabled={loading}
			/>
		</div>
	</form>
</div>
