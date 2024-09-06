<script lang="ts">
	import { goto } from '$app/navigation';

	let items: any[] = [];
	let input_timeout = setTimeout(function () {}, 0);
	$: input_value = '';

	function onItemClicked(item: any) {
		document.activeElement?.blur();
		goto(`/${item}`);
	}

	function handleInput(event: any) {
		clearTimeout(input_timeout);
		const input_length = String(event.target.value).trim().length;
		if (input_length != 0) {
			input_timeout = setTimeout(async () => {
				const res = await fetch('/api/v1/searchUsers', {
					method: 'POST',
					body: JSON.stringify({
						search_val: String(event.target.value).trim()
					}),
					headers: {
						'Content-Type': 'application/json'
					}
				});
				items = await res.json();
			}, 500);
		} else {
			items = [];
		}
	}

	$: filtered_items = items.filter(function (item) {
		return item.toLowerCase().includes(input_value.toLowerCase());
	});
</script>

<div class="dropdown mt-3 w-[75%]">
	<label class="input input-bordered flex items-center gap-2">
		<input on:input={handleInput} placeholder="Andere Nutzer finden" bind:value={input_value} />
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 16 16"
			fill="currentColor"
			class="h-4 w-4 opacity-70"
		>
			<path
				fill-rule="evenodd"
				d="M9.965 11.026a5 5 0 1 1 1.06-1.06l2.755 2.754a.75.75 0 1 1-1.06 1.06l-2.755-2.754ZM10.5 7a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z"
				clip-rule="evenodd"
			/>
		</svg>
	</label>
	<ul
		tabindex="0"
		class="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52 max-h-80 flex-nowrap overflow-auto"
	>
		{#each filtered_items as item}
			<li>
				<a on:click|preventDefault={() => onItemClicked(item)}>{item}</a>
			</li>
		{/each}
	</ul>
</div>
