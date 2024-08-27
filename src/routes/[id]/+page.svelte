<script lang="ts">
	import CardList from '$lib/UI/Cards/cardList.svelte';
	import TopBar from '$lib/UI/topBar.svelte';
	import YearBar from '$lib/UI/yearBar.svelte';
	import { dexieDB, getYears, indexToMedium, type mediaObject } from '$lib/dbUtils.js';
	import { DatePicker } from 'date-picker-svelte';
	import { onMount } from 'svelte';
	export let data;
	let { session, profile, games, movies, shows, books } = data;
	$: ({ session, profile, games, movies, shows, books } = data);

	let current_medium = 'movies';
	let current_year = String(new Date().getFullYear());
	let current_mode = 0;
	let header_text = getModeString();
	let year_media_data: mediaObject[] = [];
	let years_in_db: { year: string; active: boolean }[] = [];
	let media_data: mediaObject[] = [];
	let current_suggestions: mediaObject[] = [];
	let search_val: string;
	let input_timeout = setTimeout(function () {}, 0);
	let selected_date = new Date();
	let last_selection: mediaObject = {} as mediaObject;
	let date_modal: HTMLInputElement;
	let search_modal: HTMLInputElement;
	let form_text: string = getMediaCodeString();
	let loading = false;
	let suggestion_box: HTMLElement;
	let last_search_page = 1;

	onMount(async () => {
		if ((await dexieDB.games.toArray()).length != games.data?.length) {
			await dexieDB.games.clear();
			await dexieDB.games.bulkAdd(games.data || []);
		}
		if ((await dexieDB.movies.toArray()).length != movies.data?.length) {
			await dexieDB.movies.clear();
			await dexieDB.movies.bulkAdd(movies.data || []);
		}
		if ((await dexieDB.shows.toArray()).length != shows.data?.length) {
			await dexieDB.shows.clear();
			await dexieDB.shows.bulkAdd(shows.data || []);
		}
		if ((await dexieDB.books.toArray()).length != books.data?.length) {
			await dexieDB.books.clear();
			await dexieDB.books.bulkAdd(books.data || []);
		}
		year_media_data = await dexieDB.movies.where({ backlogged: 0 }).reverse().sortBy('added');
		media_data = year_media_data.filter((obj) => obj.added?.substring(0, 4) == current_year);
		years_in_db = getYears(year_media_data, current_year);
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
	});

	async function handleMediaSwitch(event: any) {
		let medium = indexToMedium(event.detail.index);
		try {
			// Fetch data
			let year_base_data;
			switch (medium) {
				case 'games':
					year_base_data = await dexieDB.games
						.where({ backlogged: current_mode })
						.reverse()
						.sortBy('added');
					break;
				case 'movies':
					year_base_data = await dexieDB.movies
						.where({ backlogged: current_mode })
						.reverse()
						.sortBy('added');
					break;
				case 'shows':
					year_base_data = await dexieDB.shows
						.where({ backlogged: current_mode })
						.reverse()
						.sortBy('added');
					break;
				case 'books':
					year_base_data = await dexieDB.books
						.where({ backlogged: current_mode })
						.reverse()
						.sortBy('added');
					break;
				default:
					console.log('ERROR', medium);
					break;
			}
			// YearBar Data
			if (current_mode == 0) {
				years_in_db = getYears(year_base_data as mediaObject[], current_year);
				current_year =
					years_in_db.find((obj) => obj.active == true)?.year || String(new Date().getFullYear());
			} else {
				years_in_db = years_in_db.slice(-1);
			}
			// Year Filter
			if (isNaN(Number(current_year))) {
				media_data = year_base_data || [];
			} else {
				media_data =
					year_base_data?.filter((obj) => obj.added?.substring(0, 4) == current_year) || [];
			}
			current_medium = medium;
			form_text = getMediaCodeString();
		} catch (error) {
			console.log(error);
		}
	}

	async function handleModeSwitch(event: any) {
		current_mode = event.detail.mode;
		header_text = getModeString();
		if (current_mode == 0) {
			await refreshCardList(new Date().getFullYear.toString());
		} else {
			await refreshCardList('Gesamt');
			years_in_db = years_in_db.slice(-1);
		}
	}

	async function handleYearSwitch(event: any) {
		const year = event.detail.year.year;
		let new_data;
		try {
			switch (current_medium) {
				case 'games':
					new_data = await dexieDB.games
						.where({ backlogged: current_mode })
						.reverse()
						.sortBy('added');
					break;
				case 'movies':
					new_data = await dexieDB.movies
						.where({ backlogged: current_mode })
						.reverse()
						.sortBy('added');
					break;
				case 'shows':
					new_data = await dexieDB.shows
						.where({ backlogged: current_mode })
						.reverse()
						.sortBy('added');
					break;
				case 'books':
					new_data = await dexieDB.books
						.where({ backlogged: current_mode })
						.reverse()
						.sortBy('added');
					break;
				default:
					console.log('ERROR', current_medium);
					break;
			}
			if (isNaN(year)) {
				media_data = new_data || [];
			} else {
				media_data = new_data?.filter((obj) => obj.added?.substring(0, 4) == year) || [];
			}
		} catch (error) {
			console.log(error);
		}
		current_year = year;
	}

	async function refreshCardList(set_year: string) {
		try {
			let new_data;
			switch (current_medium) {
				case 'games':
					new_data = await dexieDB.games
						.where({ backlogged: current_mode })
						.reverse()
						.sortBy('added');
					break;
				case 'movies':
					new_data = await dexieDB.movies
						.where({ backlogged: current_mode })
						.reverse()
						.sortBy('added');
					break;
				case 'shows':
					new_data = await dexieDB.shows
						.where({ backlogged: current_mode })
						.reverse()
						.sortBy('added');
					break;
				case 'books':
					new_data = await dexieDB.books
						.where({ backlogged: current_mode })
						.reverse()
						.sortBy('added');
					break;
				default:
					console.log('ERROR', current_medium);
					break;
			}
			years_in_db = getYears(new_data as mediaObject[], set_year);
			current_year =
				years_in_db.find((obj) => obj.active == true)?.year || String(new Date().getFullYear());

			if (isNaN(Number(current_year))) {
				media_data = new_data || [];
			} else {
				media_data = new_data?.filter((obj) => obj.added?.substring(0, 4) == current_year) || [];
			}
		} catch (error) {
			console.log(error);
		}
	}

	function handleInput() {
		loading = true;
		current_suggestions = [];
		clearTimeout(input_timeout);
		input_timeout = setTimeout(async () => {
			last_search_page = 1;
			const res = await fetch('/api/v1/getSearchSuggestions', {
				method: 'POST',
				body: JSON.stringify({ search_val, last_search_page, current_medium }),
				headers: {
					'Content-Type': 'application/json'
				}
			});
			loading = false;
			current_suggestions = await res.json();
		}, 1000);
	}

	async function handleSuggestionScroll() {
		const scrollProgress =
			suggestion_box.scrollTop / (suggestion_box.scrollHeight - suggestion_box.clientHeight);
		if (scrollProgress == 1 && !loading && last_search_page != -1) {
			loading = true;
			last_search_page += 1;
			const res = await fetch('/api/v1/getSearchSuggestions', {
				method: 'POST',
				body: JSON.stringify({ search_val, last_search_page, current_medium }),
				headers: {
					'Content-Type': 'application/json'
				}
			});
			const jsonRes = await res.json();
			const filteredRes = jsonRes.filter((suggestion: mediaObject) => {
				switch (current_medium) {
					case 'games':
						!current_suggestions.some((item) => item.igdbid === suggestion.igdbid);
						break;
					case 'movies' || 'shows':
						!current_suggestions.some((item) => item.tmdbid === suggestion.id);
						break;
					case 'books':
						!current_suggestions.some((item) => item.gbid === suggestion.id);
						break;
					default:
						break;
				}
			});
			if (jsonRes.length != 0) {
				current_suggestions = [...current_suggestions, ...jsonRes];
			} else {
				last_search_page = -1;
			}
			console.log(current_suggestions);
			loading = false;
		}
	}

	async function addMedium() {
		last_selection.added = selected_date.toISOString();
		last_selection.backlogged = current_mode;
		// Supabase
		const res = await fetch('/api/v1/addMedium', {
			method: 'POST',
			body: JSON.stringify({ last_selection, current_medium, user_id: session.user.id }),
			headers: {
				'Content-Type': 'application/json'
			}
		});
		// DexieDB
		console.log(last_selection);
		last_selection.id = (await res.json()).data.id;
		last_selection.rating = 0;
		console.log(last_selection);
		switch (current_medium) {
			case 'games':
				last_selection.averagerating = Number(
					((last_selection.averagerating || 0) / 10).toFixed(1)
				);
				last_selection.trophy = 0;
				dexieDB.games.add(last_selection);
				break;
			case 'movies':
				last_selection.averagerating = Number((last_selection.averagerating || 0).toFixed(1));
				dexieDB.movies.add(last_selection);
				break;
			case 'shows':
				last_selection.averagerating = Number((last_selection.averagerating || 0).toFixed(1));
				last_selection.episode = 0;
				dexieDB.shows.add(last_selection);
				break;
			case 'books':
				dexieDB.books.add(last_selection);
				break;
			default:
				console.log('DexieDB Error');
				break;
		}
		if (current_mode == 0) {
			await refreshCardList(selected_date.getFullYear().toString());
		} else {
			await refreshCardList('Gesamt');
			years_in_db = years_in_db.slice(-1);
		}
		date_modal.checked = false;
		search_modal.checked = false;
	}

	async function deleteMedium(event: any) {
		const medium_id = event.detail.id;
		const collapseInput = document.getElementById(String(medium_id));
		if (collapseInput != null && collapseInput instanceof HTMLInputElement) {
			collapseInput.checked = !collapseInput.checked;
		}
		//DexieDB
		switch (current_medium) {
			case 'games':
				dexieDB.games.delete(medium_id);
				break;
			case 'movies':
				dexieDB.movies.delete(medium_id);
				break;
			case 'shows':
				dexieDB.shows.delete(medium_id);
				break;
			case 'books':
				dexieDB.books.delete(medium_id);
				break;
			default:
				console.log('Error deleting DexieDB Entry');
				break;
		}
		//Supabase
		const res = await fetch('/api/v1/deleteMedium', {
			method: 'POST',
			body: JSON.stringify({ medium_id, current_medium }),
			headers: {
				'Content-Type': 'application/json'
			}
		});
		console.log(res);
		if (current_mode == 0) {
			await refreshCardList(current_year);
		} else {
			await refreshCardList('Gesamt');
			years_in_db = years_in_db.slice(-1);
		}
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

	function getModeString() {
		switch (current_mode) {
			case 0:
				return 'Medien Log';
			case 1:
				return 'Backlog';
			default:
				return 'ERROR';
		}
	}

	async function listDexie() {
		console.log('GAMES', await dexieDB.games.toArray());
		console.log('MOVIES', await dexieDB.movies.toArray());
		console.log('SHOWS', await dexieDB.shows.toArray());
		console.log('BOOKS', await dexieDB.books.toArray());
	}

	async function clearDexie() {
		await dexieDB.games.clear();
		await dexieDB.movies.clear();
		await dexieDB.shows.clear();
		await dexieDB.books.clear();
	}
</script>

<div class="flex flex-col h-screen">
	<TopBar
		on:switchMedium={handleMediaSwitch}
		on:switchMode={handleModeSwitch}
		header={`${profile.username}'s ${header_text}`}
		settingsButton={true}
		navBackButton={false}
	></TopBar>
	<CardList
		{media_data}
		{current_medium}
		{current_mode}
		on:delete={deleteMedium}
		on:refresh={() => refreshCardList(current_year)}
	></CardList>
	<!-- <button
		class="btn btn-neutral flex fixed bottom-[19.5%] inset-x-0 mx-3 min-h-[5%] h-[4%] font-bold text-2xl"
		on:click={clearDexie}>DEXIE CLEAR</button
	>
	<button
		class="btn btn-neutral flex fixed bottom-[13.5%] inset-x-0 mx-3 min-h-[5%] h-[4%] font-bold text-2xl"
		on:click={listDexie}>DEXIE DEBUG</button
	> -->
	<button
		on:click={() => {
			search_val = '';
			selected_date = new Date();
			search_modal.checked = true;
			current_suggestions = [];
		}}
		class="btn btn-neutral flex fixed bottom-[7.5%] inset-x-0 mx-3 min-h-[5%] h-[4%] font-bold text-2xl"
	>
		+
	</button>

	<YearBar on:switch={handleYearSwitch} years={years_in_db}></YearBar>

	<!-- Modals from here on -->
	<!-- SearchModal -->
	<input type="checkbox" id="search_modal" class="modal-toggle" bind:this={search_modal} />
	<div class="modal" role="dialog">
		<div class="modal-box">
			<p class=" font-bold text-lg text-center mb-3">{form_text} hinzufügen</p>
			<label class="input input-bordered flex items-center gap-2 mb-3">
				<input
					type="text"
					class="grow"
					placeholder="Search"
					bind:value={search_val}
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
			<div
				bind:this={suggestion_box}
				class="overflow-y-auto max-h-[50vh]"
				on:scroll={handleSuggestionScroll}
			>
				{#each current_suggestions as suggestion}
					<button
						class="btn w-full mb-3 h-fit py-2"
						on:click={() => {
							last_selection = suggestion;
							if (current_mode == 0) {
								date_modal.checked = true;
							} else {
								addMedium();
							}
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
		<label class="modal-backdrop" for="search_modal">Close</label>
	</div>
	<!-- DateModal -->
	<input type="checkbox" id="date_modal" class="modal-toggle" bind:this={date_modal} />
	<div class="modal" role="dialog">
		<div class="modal-box flex flex-col">
			<p class="font-bold text-lg text-center mb-1">{last_selection.title}</p>
			<p class="text-center text-base font-semibold mb-3">gesehen:</p>
			<DatePicker bind:value={selected_date} max={new Date()} browseWithoutSelecting={true}
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
