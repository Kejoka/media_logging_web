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

<div class="relative w-full">
	<div class="relative">
		<input
			class="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 pr-10 text-sm text-white placeholder-neutral-500 transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
			oninput={handleInput}
			placeholder="Andere Nutzer finden..."
			bind:value={input_value}
		/>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 16 16"
			fill="currentColor"
			class="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-neutral-400"
		>
			<path
				fill-rule="evenodd"
				d="M9.965 11.026a5 5 0 1 1 1.06-1.06l2.755 2.754a.75.75 0 1 1-1.06 1.06l-2.755-2.754ZM10.5 7a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z"
				clip-rule="evenodd"
			/>
		</svg>
	</div>

	{#if filtered_items.length > 0}
		<ul
			class="absolute z-10 mt-2 max-h-72 w-full overflow-auto rounded-lg border border-white/10 bg-neutral-900/95 p-1 shadow-lg"
		>
			{#each filtered_items as item}
				<li>
					<button
						type="button"
						class="w-full rounded-md px-3 py-2 text-left text-sm text-neutral-200 transition hover:bg-white/10 hover:text-white"
						onclick={() => onItemClicked(item)}
					>
						{item}
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>
