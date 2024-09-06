<script lang="ts">
	import { fade } from 'svelte/transition';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { type SubmitFunction } from '@sveltejs/kit';
	export let data;
	export let form;
	let { profile } = data;
	$: ({ profile } = data);
	let username: string = profile?.username ?? '';
	let loading = false;
	let displaying_error = false;
	let error_message: string;

	const handleUpdate: SubmitFunction = () => {
		loading = true;
		return (res) => {
			loading = false;
			if (res.result.type === 'success') {
				goto(`/${res.result.data?.username}`);
			} else if (res.result.type === 'failure') {
				if (res.result.data?.error?.code === '23514') {
					error_message = 'Der Nutzername ist zu kurz!';
				} else if (res.result.data?.error?.code === '23505') {
					error_message = 'Der Nutzername existiert bereits!';
				} else {
					error_message =
						'Ein unbekannter Fehler ist aufgetreten. Bitte versuche es später noch einmal';
				}
				displaying_error = true;
				setTimeout(() => {
					displaying_error = false;
				}, 4000);
			}
		};
	};
</script>

<svelte:head>
	<title>Nutzername</title>
</svelte:head>

<div class="flex flex-col text-center w-[80%] m-auto h-[100vh] justify-center">
	<img class="max-w-[30%] mx-auto" src="/icon-512x512.png" alt="Icon" />

	<form class=" text-center" method="post" action="?/update" use:enhance={handleUpdate}>
		<p class="text-center text-md font-bold my-3">Willkommen!</p>
		<p class="text-center text-md font-bold my-3">Bitte wähle einen Nutzernamen</p>
		<div>
			<label for="username" class="input input-bordered flex items-center gap-2 mb-3">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 16 16"
					fill="currentColor"
					class="h-4 w-4 opacity-70"
				>
					<path
						d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM12.735 14c.618 0 1.093-.561.872-1.139a6.002 6.002 0 0 0-11.215 0c-.22.578.254 1.139.872 1.139h9.47Z"
					/>
				</svg>
				<input
					id="username"
					name="username"
					type="text"
					class="grow"
					placeholder="Nutzername"
					value={form?.username ?? username}
				/>
			</label>
		</div>

		<div>
			<input
				type="submit"
				class="btn btn-primary"
				value={loading ? 'Loading...' : 'Nutzername überprüfen'}
				disabled={loading}
			/>
		</div>
	</form>
</div>
{#if displaying_error}
	<div class="toast toast-top toast-center" transition:fade={{ delay: 250, duration: 300 }}>
		<div class="alert alert-error">
			<span>{error_message}</span>
		</div>
	</div>
{/if}
