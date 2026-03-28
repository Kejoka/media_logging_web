<script lang="ts">
	export let label = '';
	export let value: string[] = [];
	export let suggestions: string[] = [];
	export let placeholder = 'Tag hinzufügen';
	export let allowCustom = true;
	export let maxSuggestions = 12;

	let inputValue = '';
	let suppressBlurAdd = false;

	function normalizeTag(tag: string): string {
		return tag.replace(/\s+/g, ' ').trim();
	}

	function hasTag(tag: string): boolean {
		const normalizedTag = normalizeTag(tag);
		return value.some(
			(entry) => normalizeTag(entry).localeCompare(normalizedTag, 'de', { sensitivity: 'accent' }) === 0
		);
	}

	function addTag(rawTag: string) {
		const tag = normalizeTag(rawTag);
		if (tag.length === 0) {
			return;
		}
		if (!allowCustom && !suggestions.includes(tag)) {
			return;
		}
		if (!hasTag(tag)) {
			value = [...value, tag];
		}
		inputValue = '';
	}

	function selectSuggestion(suggestion: string) {
		suppressBlurAdd = true;
		const tag = normalizeTag(suggestion);
		if (!hasTag(tag)) {
			value = [...value, tag];
		}
		inputValue = '';
	}

	function handleInputBlur() {
		if (suppressBlurAdd) {
			suppressBlurAdd = false;
			return;
		}
		addTag(inputValue);
	}

	function removeTag(tag: string) {
		value = value.filter((entry) => entry !== tag);
	}

	function handleInputKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' || event.key === ',') {
			event.preventDefault();
			addTag(inputValue);
		}
		if (event.key === 'Backspace' && inputValue.length === 0 && value.length > 0) {
			value = value.slice(0, -1);
		}
	}

	$: filteredSuggestions = suggestions
		.filter((entry) => {
			const normalizedEntry = normalizeTag(entry);
			return !value.some(
				(selectedTag) =>
					normalizeTag(selectedTag).localeCompare(normalizedEntry, 'de', { sensitivity: 'accent' }) === 0
			);
		})
		.filter((entry) => {
			const query = inputValue.trim().toLowerCase();
			if (query.length === 0) {
				return true;
			}
			return entry.toLowerCase().includes(query);
		})
		.slice(0, maxSuggestions);
</script>

<div class="form-control w-full gap-1">
	{#if label}
		<div class="label pb-1.5">
			<span class="label-text font-medium">{label}</span>
		</div>
	{/if}
	<div class="ml-section space-y-2 p-3">
		<div class="flex flex-wrap gap-2">
			{#if value.length === 0}
				<span class="text-xs opacity-60">Noch keine Auswahl</span>
			{:else}
				{#each value as tag (tag)}
					<button
						type="button"
						class="badge h-7 gap-2 rounded-full border-base-content/15 bg-base-100 px-3 text-sm"
						on:click={() => removeTag(tag)}
						title="Tag entfernen"
					>
						<span>{tag}</span>
						<span aria-hidden="true">x</span>
					</button>
				{/each}
			{/if}
		</div>
		<input
			type="text"
			class="ml-input"
			{placeholder}
			bind:value={inputValue}
			on:keydown={handleInputKeydown}
			on:blur={handleInputBlur}
		/>
		{#if filteredSuggestions.length > 0}
			<div class="flex flex-wrap gap-3 bg-base-200 p-3 rounded-lg shadow-inner">
				{#each filteredSuggestions as suggestion (suggestion)}
					<button
						type="button"
						class="badge h-7 rounded-full border border-base-content/15 bg-base-100 px-3 text-sm hover:bg-base-200"
						on:mousedown|preventDefault={() => selectSuggestion(suggestion)}
					>
						{suggestion}
					</button>
				{/each}
			</div>
		{/if}
	</div>
</div>
