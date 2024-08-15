<script lang="ts">
	import CardList from '$lib/UI/Cards/cardList.svelte';
	import TopBar from '$lib/UI/topBar.svelte';
	import YearBar from '$lib/UI/yearBar.svelte';
	import { getYears, indexToMedium, type mediaObject } from '$lib/dbUtils.js';
	import { supabase } from '$lib/supabaseClient.js';
	import { DatePicker } from 'date-picker-svelte';
	export let data;
	let { session, profile, movies } = data;
	$: ({ session, profile, movies } = data);

	let current_medium = 'movies';
	let current_year = String(new Date().getFullYear());
	let year_media_data: mediaObject[] = movies.data ? movies.data : [];
	let years_in_db = getYears(year_media_data, current_year);
	let current_suggestions: mediaObject[] = [];
	let searchVal: string;
	let inputTimeout = setTimeout(function () {}, 0);
	let selectedDate = new Date();
	let last_selection: mediaObject = {} as mediaObject;
	let date_modal: HTMLInputElement;
	let form_modal: HTMLInputElement;
	let form_text: string = getMediaCodeString();
	let loading = false;

	// years_in_db = [
	// 	{ year: String(2000), active: false },
	// 	{ year: String(2000), active: false },
	// 	{ year: String(2001), active: false },
	// 	{ year: String(2002), active: false },
	// 	{ year: String(2003), active: false },
	// 	{ year: String(2004), active: false },
	// 	{ year: String(2005), active: false },
	// 	{ year: String(2006), active: false },
	// 	{ year: String(2007), active: true }
	// ];

	let media_data = year_media_data.filter(
		(obj) => new Date(obj.added || 404).getFullYear() == Number(current_year)
	);

	async function handleSwitch(event: any) {
		let medium = indexToMedium(event.detail.index);
		try {
			const year_base_data = await supabase
				.from(medium)
				.select()
				.eq('user_id', session.user.id)
				.eq('backlogged', 0)
				.order('added', { ascending: false });
			years_in_db = getYears(year_base_data.data as mediaObject[], current_year);
			current_year =
				years_in_db.find((obj) => obj.active == true)?.year || String(new Date().getFullYear());
			let new_data;
			if (isNaN(Number(current_year))) {
				new_data = year_base_data;
			} else {
				new_data = await supabase
					.from(medium)
					.select()
					.eq('user_id', session.user.id)
					.eq('backlogged', 0)
					.lt('added', `${Number(current_year) + 1}-01-01`)
					.gte('added', `${current_year}-01-01`)
					.order('added', { ascending: false });
			}
			media_data = new_data.data ? new_data.data : [];
			current_medium = medium;
			form_text = getMediaCodeString();
		} catch (error) {
			console.log(error);
		}
	}

	async function handleYearSwitch(event: any) {
		const year = event.detail.year.year;
		let new_data;
		if (isNaN(year)) {
			new_data = await supabase
				.from(current_medium)
				.select()
				.eq('user_id', session.user.id)
				.eq('backlogged', 0)
				.order('added', { ascending: false });
		} else {
			new_data = await supabase
				.from(current_medium)
				.select()
				.eq('user_id', session.user.id)
				.eq('backlogged', 0)
				.lt('added', `${Number(year) + 1}-01-01`)
				.gte('added', `${year}-01-01`)
				.order('added', { ascending: false });
			console.log(new_data.data);
		}
		media_data = new_data.data ? new_data.data : [];
		current_year = year;
	}

	async function refreshCardList(set_year: string) {
		try {
			const year_base_data = await supabase
				.from(current_medium)
				.select()
				.eq('user_id', session.user.id)
				.eq('backlogged', 0)
				.order('added', { ascending: false });
			years_in_db = getYears(year_base_data.data as mediaObject[], set_year);
			current_year =
				years_in_db.find((obj) => obj.active == true)?.year || String(new Date().getFullYear());
			let new_data;
			if (isNaN(Number(current_year))) {
				new_data = year_base_data;
			} else {
				new_data = await supabase
					.from(current_medium)
					.select()
					.eq('user_id', session.user.id)
					.eq('backlogged', 0)
					.lt('added', `${Number(current_year) + 1}-01-01`)
					.gte('added', `${current_year}-01-01`)
					.order('added', { ascending: false });
			}
			media_data = new_data.data ? new_data.data : [];
		} catch (error) {
			console.log(error);
		}
	}

	function handleInput() {
		loading = true;
		clearTimeout(inputTimeout);
		inputTimeout = setTimeout(async () => {
			const res = await fetch('/api/v1/getSearchSuggestions', {
				method: 'POST',
				body: JSON.stringify({ searchVal, page: 1, current_medium }),
				headers: {
					'Content-Type': 'application/json'
				}
			});
			loading = false;
			current_suggestions = await res.json();
		}, 1000);
	}

	async function addMedium() {
		last_selection.added = selectedDate.toISOString();
		const res = await fetch('/api/v1/addMedium', {
			method: 'POST',
			body: JSON.stringify({ last_selection, current_medium, user_id: session.user.id }),
			headers: {
				'Content-Type': 'application/json'
			}
		});
		await refreshCardList(selectedDate.getFullYear().toString());
		date_modal.checked = false;
		form_modal.checked = false;
	}

	async function deleteMedium(event: any) {
		const medium_id = event.detail.id;
		const collapseInput = document.getElementById(String(medium_id));
		if (collapseInput != null) {
			collapseInput.checked = !collapseInput.checked;
		}
		const res = await fetch('/api/v1/deleteMedium', {
			method: 'POST',
			body: JSON.stringify({ medium_id, current_medium }),
			headers: {
				'Content-Type': 'application/json'
			}
		});
		await refreshCardList(current_year);
	}

	function getMediaCodeString() {
		switch (current_medium) {
			case 'games':
				return 'Game';
			case 'movies':
				return 'Film';
			case 'shows':
				return 'Serie';
			case 'books':
				return 'Buch';
			default:
				return 'Error';
		}
	}
</script>

<div class="flex flex-col h-screen">
	<TopBar
		on:switch={handleSwitch}
		header={`${profile.username}'s Watchlist`}
		settingsButton={true}
		navBackButton={false}
	></TopBar>
	<CardList {media_data} {current_medium} on:delete={deleteMedium}></CardList>
	<button
		on:click={() => {
			searchVal = '';
			selectedDate = new Date();
			form_modal.checked = true;
			current_suggestions = [];
		}}
		class="btn btn-neutral flex fixed bottom-[7.5%] inset-x-0 mx-3 min-h-[5%] h-[4%] font-bold text-2xl"
	>
		+
	</button>
	<YearBar on:switch={handleYearSwitch} years={years_in_db}></YearBar>
	<!-- Modals from here on -->
	<input type="checkbox" id="form_modal" class="modal-toggle" bind:this={form_modal} />
	<div class="modal" role="dialog">
		<div class="modal-box">
			<p class=" font-bold text-lg text-center mb-3">{form_text} hinzufügen</p>
			<label class="input input-bordered flex items-center gap-2 mb-3">
				<input
					type="text"
					class="grow"
					placeholder="Search"
					bind:value={searchVal}
					on:input={handleInput}
				/>
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
			<div class=" overflow-y-auto max-h-[50vh]">
				{#each current_suggestions as suggestion}
					<button
						class="btn w-full mb-3 h-fit py-2"
						on:click={() => {
							last_selection = suggestion;
							date_modal.checked = true;
						}}
					>
						<div class="flex flex-col">
							<p class="font-bold text-base">
								{`${suggestion.title} (${new Date(suggestion.release || 404).getFullYear()})`}
							</p>
							{#if suggestion.author != undefined}
								<p class="text-sm">Von: {suggestion.author || ''}</p>
							{/if}
							<p class="text-sm">{suggestion.genres || ''}</p>
						</div>
					</button>
				{/each}
				{#if loading}
					<div class="flex">
						<span class="loading loading-dots loading-md m-auto mt-3"></span>
					</div>
				{/if}
			</div>
		</div>
		<label class="modal-backdrop" for="form_modal">Close</label>
	</div>
	<input type="checkbox" id="date_modal" class="modal-toggle" bind:this={date_modal} />
	<div class="modal" role="dialog">
		<div class="modal-box flex flex-col">
			<p class="font-bold text-lg text-center mb-1">{last_selection.title}</p>
			<p class="text-center text-base font-semibold mb-3">gesehen:</p>
			<DatePicker bind:value={selectedDate} max={new Date()} browseWithoutSelecting={true}
			></DatePicker>
			<button class="btn btn-neutral mt-3" on:click={addMedium}>Hinzufügen</button>
		</div>
		<label class="modal-backdrop" for="date_modal">Close</label>
	</div>
</div>

<style>
	:global(body) {
		--date-picker-foreground: oklch(var(--nc));
		--date-picker-background: oklch(var(--n));
	}
</style>
