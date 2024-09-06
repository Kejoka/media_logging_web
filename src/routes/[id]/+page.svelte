<script lang="ts">
	import CardList from '$lib/UI/Cards/cardList.svelte';
	import TopBar from '$lib/UI/topBar.svelte';
	import YearBar from '$lib/UI/yearBar.svelte';
	import {
		dexieDB,
		getYears,
		indexToMedium,
		redoDexieChanges,
		type mediaObject,
		type OfflineChangeObject
	} from '$lib/dbUtils.js';
	import { DatePicker } from 'date-picker-svelte';
	import { onMount } from 'svelte';
	import { online_status } from '../../stores/onlineStatus';
	import Fuse, { type IFuseOptions } from 'fuse.js';
	export let data;
	let { session, profile, user_id, games, movies, shows, books } = data;
	$: is_online = $online_status;
	$: ({ session, profile, user_id, games, movies, shows, books } = data);
	// HTML bind variables
	let date_modal: HTMLInputElement;
	let search_modal: HTMLInputElement;
	let backlog_modal: HTMLInputElement;
	let suggestion_box: HTMLElement;
	let carousel: HTMLElement;
	let backlog_button_1: HTMLButtonElement;
	let backlog_button_2: HTMLButtonElement;
	let backlog_button_3: HTMLButtonElement;
	let add_button: HTMLButtonElement;
	// State variables
	const own_profile = profile.id == user_id;
	let current_medium = 'movies';
	let current_tab_index = 1;
	let current_year = String(new Date().getFullYear());
	let current_mode = 0;
	let current_suggestions: mediaObject[] = [];
	let last_selection: mediaObject = {} as mediaObject;
	let selected_date = new Date();
	let search_val: string;
	let form_text: string = getMediaCodeString();
	let loading = false;
	let last_search_page = 1;
	// Media data variables
	let total_media_data: mediaObject[][] = [];
	let years_in_db: { year: string; active: boolean }[] = [];
	let media_data: mediaObject[][] = [[], [], [], []];
	let media_data_unfiltered: mediaObject[][] = [];
	let backlog_matches: mediaObject[];
	// Misc variables
	let header_text = getModeString();
	let input_timeout = setTimeout(function () {}, 0);
	const fuse_options: IFuseOptions<mediaObject> = {
		keys: ['title'],
		isCaseSensitive: false,
		minMatchCharLength: 3
	};

	// Load data and set up inital states depending on online status and sync status
	onMount(async () => {
		// Set inital carousel state
		carousel.scrollLeft = current_tab_index * carousel.clientWidth;
		// If user is online
		if (is_online) {
			if (!own_profile) {
				await cloneSupabase(true);
			} else {
				// Online and no DexieDB yet
				if ((await dexieDB.prefs.toArray()).length == 0) {
					await dexieDB.prefs.add({
						id: 0,
						updated_at: new Date(profile.updated_at).toISOString(),
						changed_offline: '[]'
					});
					await cloneSupabase(false);
				} else {
					// Online, not in sync, dexie most recent
					if (
						new Date((await dexieDB.prefs.toArray())[0].updated_at) > new Date(profile.updated_at)
					) {
						console.log('NOT IN SYNC, NEW CHANGES IN DEXIE');
						await redoDexieChanges();
					}
					// Online, not in sync, supabase most recent
					else if (
						new Date((await dexieDB.prefs.toArray())[0].updated_at) < new Date(profile.updated_at)
					) {
						console.log('NOT IN SYNC, NEW CHANGES IN SUPABASE');
						await cloneSupabase(false);
						await dexieDB.prefs.update(0, {
							updated_at: new Date(profile.updated_at).toISOString()
						});
					}
				}
			}
		}
		// If user is offline
		else {
			// Unlikely state that ensures supabase will be clones next time the user is online
			if ((await dexieDB.prefs.toArray()).length == 0) {
				await dexieDB.prefs.add({
					id: 0,
					updated_at: new Date('01.01.2000').toISOString(),
					changed_offline: '[]'
				});
			}
		}
		// Handle data from visited user profile
		if (!own_profile) {
			total_media_data.push(
				await dexieDB.games_other.where({ backlogged: 0 }).reverse().sortBy('added')
			);
			total_media_data.push(
				await dexieDB.movies_other.where({ backlogged: 0 }).reverse().sortBy('added')
			);
			total_media_data.push(
				await dexieDB.shows_other.where({ backlogged: 0 }).reverse().sortBy('added')
			);
			total_media_data.push(
				await dexieDB.books_other.where({ backlogged: 0 }).reverse().sortBy('added')
			);
		}
		// Handle own data
		else {
			total_media_data.push(await dexieDB.games.where({ backlogged: 0 }).reverse().sortBy('added'));
			total_media_data.push(
				await dexieDB.movies.where({ backlogged: 0 }).reverse().sortBy('added')
			);
			total_media_data.push(await dexieDB.shows.where({ backlogged: 0 }).reverse().sortBy('added'));
			total_media_data.push(await dexieDB.books.where({ backlogged: 0 }).reverse().sortBy('added'));
		}
		for (let [index, media] of total_media_data.entries()) {
			media_data[index] = media.filter((obj) => obj.added?.substring(0, 4) == current_year);
		}
		for (let media of media_data) {
			media_data_unfiltered.push(media);
		}
		years_in_db = getYears(total_media_data[getMediaCodeIndex()], current_year);
	});

	// Clones supabase contents depending on whether or not the user is on their own profile
	async function cloneSupabase(other: boolean) {
		if (!other) {
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
		} else {
			if ((await dexieDB.games_other.toArray()).length != games.data?.length) {
				await dexieDB.games_other.clear();
				await dexieDB.games_other.bulkAdd(games.data || []);
			}
			if ((await dexieDB.movies_other.toArray()).length != movies.data?.length) {
				await dexieDB.movies_other.clear();
				await dexieDB.movies_other.bulkAdd(movies.data || []);
			}
			if ((await dexieDB.shows_other.toArray()).length != shows.data?.length) {
				await dexieDB.shows_other.clear();
				await dexieDB.shows_other.bulkAdd(shows.data || []);
			}
			if ((await dexieDB.books_other.toArray()).length != books.data?.length) {
				await dexieDB.books_other.clear();
				await dexieDB.books_other.bulkAdd(books.data || []);
			}
		}
	}
	// Handles the switches between games, movies, shows and books
	async function handleMediaSwitch(event: any) {
		clearTimeout(input_timeout);
		input_timeout = setTimeout(() => {
			if (event.type == 'scroll') {
				if (Number.isInteger((carousel.scrollLeft / carousel.scrollWidth) * 4)) {
					current_tab_index = (carousel.scrollLeft / carousel.scrollWidth) * 4;
				} else {
					return;
				}
			} else {
				current_tab_index = event.detail.index;
				carousel.scrollLeft = event.detail.index * carousel.clientWidth;
			}
			current_medium = indexToMedium(current_tab_index);
			// YearBar Data
			if (current_mode != 1) {
				years_in_db = getYears(total_media_data[getMediaCodeIndex()], current_year);
				current_year =
					years_in_db.find((obj) => obj.active == true)?.year || String(new Date().getFullYear());
			} else {
				years_in_db = years_in_db.slice(-1);
			}
			form_text = getMediaCodeString();
			// Year Filter
			if (isNaN(Number(current_year))) {
				for (let [index, media] of total_media_data.entries()) {
					media_data[index] = media;
				}
			} else {
				for (let [index, media] of total_media_data.entries()) {
					media_data[index] = media.filter((obj) => obj.added?.substring(0, 4) == current_year);
				}
			}
			for (let [index, media] of media_data.entries()) {
				media_data_unfiltered[index] = media;
			}
		}, 20);
	}
	// Handle the switch between the modes Media-Log, Backlog and Stats
	async function handleModeSwitch(event: any) {
		current_mode = event.detail.mode;
		header_text = getModeString();
		if (current_mode != 1) {
			await refreshCardList(new Date().getFullYear.toString());
		} else {
			await refreshCardList('Gesamt');
			years_in_db = years_in_db.slice(-1);
		}
	}
	// HAndle the switch between individual years
	async function handleYearSwitch(event: any) {
		const year = event.detail.year.year;
		let new_data;

		if (isNaN(year)) {
			for (let [index, media] of total_media_data.entries()) {
				media_data[index] = media;
			}
		} else {
			for (let [index, media] of total_media_data.entries()) {
				media_data[index] = media.filter((obj) => obj.added?.substring(0, 4) == year);
			}
		}
		for (let [index, media] of media_data.entries()) {
			media_data_unfiltered[index] = media;
		}
		current_year = year;
	}
	// Refreshes the current card list to visualize recent changes
	async function refreshCardList(set_year: string) {
		if (!own_profile) {
			total_media_data[0] = await dexieDB.games_other
				.where({ backlogged: current_mode == 1 ? 1 : 0 })
				.reverse()
				.sortBy('added');
			total_media_data[1] = await dexieDB.movies_other
				.where({ backlogged: current_mode == 1 ? 1 : 0 })
				.reverse()
				.sortBy('added');
			total_media_data[2] = await dexieDB.shows_other
				.where({ backlogged: current_mode == 1 ? 1 : 0 })
				.reverse()
				.sortBy('added');
			total_media_data[3] = await dexieDB.books_other
				.where({ backlogged: current_mode == 1 ? 1 : 0 })
				.reverse()
				.sortBy('added');
		} else {
			total_media_data[0] = await dexieDB.games
				.where({ backlogged: current_mode == 1 ? 1 : 0 })
				.reverse()
				.sortBy('added');
			total_media_data[1] = await dexieDB.movies
				.where({ backlogged: current_mode == 1 ? 1 : 0 })
				.reverse()
				.sortBy('added');
			total_media_data[2] = await dexieDB.shows
				.where({ backlogged: current_mode == 1 ? 1 : 0 })
				.reverse()
				.sortBy('added');
			total_media_data[3] = await dexieDB.books
				.where({ backlogged: current_mode == 1 ? 1 : 0 })
				.reverse()
				.sortBy('added');
		}
		years_in_db = getYears(total_media_data[getMediaCodeIndex()], set_year);
		current_year =
			years_in_db.find((obj) => obj.active == true)?.year || String(new Date().getFullYear());

		if (isNaN(Number(current_year))) {
			for (let [index, media] of total_media_data.entries()) {
				media_data[index] = media;
			}
		} else {
			for (let [index, media] of total_media_data.entries()) {
				media_data[index] = media.filter((obj) => obj.added?.substring(0, 4) == current_year);
			}
		}
		for (let [index, media] of media_data.entries()) {
			media_data_unfiltered[index] = media;
		}
	}
	// Handles input changes in the add medium form
	function handleInput() {
		if (!is_online) {
			current_suggestions = [{ title: search_val, release: new Date().toISOString() }];
			return;
		}
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
	// Handles input changes in the search bar filter
	async function handleFilter(event: CustomEvent) {
		if (event.detail.trim().length == 0) {
			for (let [index, media] of media_data.entries()) {
				media = media_data_unfiltered[index];
			}
		} else {
			let fuses: Fuse<mediaObject>[] = [];
			for (let media of media_data_unfiltered) {
				fuses.push(new Fuse(media, fuse_options));
			}
			for (let [index, media] of media_data.entries()) {
				media_data[index] = fuses[index]
					.search(event.detail.trim())
					.map((res) => res.item) as mediaObject[];
			}
		}
	}
	// Handles reaching the end of the current suggestions and lazy loads more suggestions
	async function handleSuggestionScroll() {
		const scroll_progress =
			suggestion_box.scrollTop / (suggestion_box.scrollHeight - suggestion_box.clientHeight);
		if (scroll_progress == 1 && !loading && last_search_page != -1) {
			loading = true;
			last_search_page += 1;
			const res = await fetch('/api/v1/getSearchSuggestions', {
				method: 'POST',
				body: JSON.stringify({ search_val, last_search_page, current_medium }),
				headers: {
					'Content-Type': 'application/json'
				}
			});
			const json_res = await res.json();
			if (json_res.length != 0) {
				current_suggestions = [...current_suggestions, ...json_res];
			} else {
				last_search_page = -1;
			}
			console.log(current_suggestions);
			loading = false;
		}
	}
	// Checks if an item that is about to be added already exists in the backlog
	async function checkBacklog() {
		// Check for item in Backlog
		switch (current_medium) {
			case 'games':
				backlog_matches = await dexieDB.games
					.filter((medium) => medium.title === last_selection.title && medium.backlogged == 1)
					.toArray();
				break;
			case 'movies':
				backlog_matches = await dexieDB.movies
					.filter((medium) => medium.title === last_selection.title && medium.backlogged == 1)
					.toArray();
				break;
			case 'shows':
				backlog_matches = await dexieDB.shows
					.filter((medium) => medium.title === last_selection.title && medium.backlogged == 1)
					.toArray();
				break;
			case 'books':
				backlog_matches = await dexieDB.books
					.filter((medium) => medium.title === last_selection.title && medium.backlogged == 1)
					.toArray();
				break;
			default:
				break;
		}
		if (backlog_matches.length != 0) {
			backlog_modal.checked = true;
		} else {
			addMedium(2);
		}
	}

	/**
	 * @param backlog_event
	 * 0 == remove from backlog and transfer notes
	 * 1 == remove from backlog and discard notes
	 * 2 == keep in backlog
	 */
	async function addMedium(backlog_event: number) {
		backlog_modal.checked = false;
		last_selection.added = selected_date.toISOString();
		last_selection.backlogged = current_mode;
		const sync_timestamp = new Date();
		// Handle Backlog Events
		let backlog_notes: string = '';
		if (backlog_event in [0, 1]) {
			for (let backlog_match of backlog_matches) {
				// Merge Backlog Notes
				if (backlog_match.notes) {
					backlog_notes += backlog_match.notes + '\n';
				}
				//DexieDB
				switch (current_medium) {
					case 'games':
						dexieDB.games.delete(backlog_match.id);
						break;
					case 'movies':
						dexieDB.movies.delete(backlog_match.id);
						break;
					case 'shows':
						dexieDB.shows.delete(backlog_match.id);
						break;
					case 'books':
						dexieDB.books.delete(backlog_match.id);
						break;
					default:
						console.log('Error deleting DexieDB Entry');
						break;
				}
				//Supabase
				try {
					const res = await fetch('/api/v1/deleteMedium', {
						method: 'POST',
						body: JSON.stringify({
							medium_id: backlog_match.id,
							current_medium,
							sync_timestamp
						}),
						headers: {
							'Content-Type': 'application/json'
						}
					});
				} catch (error) {
					console.log(error);
					let dexie_prefs = (await dexieDB.prefs.toArray()).at(0);
					if (dexie_prefs) {
						if (!is_online) {
							const tmp: OfflineChangeObject[] = JSON.parse(dexie_prefs.changed_offline);
							tmp.push({
								event: 'delete',
								medium: current_medium,
								card: { id: backlog_match.id } as mediaObject
							});
							dexie_prefs.changed_offline = JSON.stringify(tmp);
						}
						dexie_prefs.updated_at = sync_timestamp.toISOString();
						await dexieDB.prefs.update(0, dexie_prefs);
					}
				}
			}
		}
		if (backlog_event == 0 && backlog_notes.length != 0) {
			last_selection.notes = backlog_notes.substring(0, backlog_notes.length - 1);
		}
		// Supabase
		try {
			const dexie_prefs = (await dexieDB.prefs.toArray()).at(0);
			if (JSON.parse(dexie_prefs?.changed_offline || '').length != 0) {
				redoDexieChanges();
			}
			const res = await fetch('/api/v1/addMedium', {
				method: 'POST',
				body: JSON.stringify({
					last_selection,
					current_medium,
					sync_timestamp
				}),
				headers: {
					'Content-Type': 'application/json'
				}
			});
			last_selection.id = (await res.json()).data.id;
		} catch (error) {
			console.log(error);
		}
		// DexieDB
		last_selection.rating = 0;
		switch (current_medium) {
			case 'games':
				last_selection.averagerating = Number(
					((last_selection.averagerating || 0) / 10).toFixed(1)
				);
				last_selection.trophy = 0;
				await dexieDB.games.add(last_selection);
				break;
			case 'movies':
				last_selection.averagerating = Number((last_selection.averagerating || 0).toFixed(1));
				await dexieDB.movies.add(last_selection);
				break;
			case 'shows':
				last_selection.averagerating = Number((last_selection.averagerating || 0).toFixed(1));
				last_selection.episode = 0;
				await dexieDB.shows.add(last_selection);
				break;
			case 'books':
				await dexieDB.books.add(last_selection);
				break;
			default:
				console.log('DexieDB Error');
				break;
		}
		let dexie_prefs = (await dexieDB.prefs.toArray()).at(0);
		if (dexie_prefs) {
			if (!is_online) {
				const tmp: OfflineChangeObject[] = JSON.parse(dexie_prefs.changed_offline);
				tmp.push({ event: 'add', medium: current_medium, card: last_selection });
				dexie_prefs.changed_offline = JSON.stringify(tmp);
			}
			dexie_prefs.updated_at = sync_timestamp.toISOString();
			await dexieDB.prefs.update(0, dexie_prefs);
		}
		if (current_mode == 0) {
			await refreshCardList(selected_date.getFullYear().toString());
		} else {
			await refreshCardList('Gesamt');
			years_in_db = years_in_db.slice(-1);
		}
		date_modal.checked = false;
		search_modal.checked = false;
		add_button.disabled = false;
		backlog_button_1.disabled = false;
		backlog_button_2.disabled = false;
		backlog_button_3.disabled = false;
	}

	async function deleteMedium(event: any) {
		const medium_id = event.detail.id;
		const sync_timestamp = new Date();
		const collapse_input = document.getElementById(
			String(medium_id) + `_${current_medium.charAt(0)}`
		);
		if (collapse_input != null && collapse_input instanceof HTMLInputElement) {
			collapse_input.checked = !collapse_input.checked;
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
		await dexieDB.prefs.update(0, { updated_at: sync_timestamp.toISOString() });
		//Supabase
		try {
			const dexie_prefs = (await dexieDB.prefs.toArray()).at(0);
			if (JSON.parse(dexie_prefs?.changed_offline || '').length != 0) {
				redoDexieChanges();
			}
			const res = await fetch('/api/v1/deleteMedium', {
				method: 'POST',
				body: JSON.stringify({ medium_id, current_medium, sync_timestamp }),
				headers: {
					'Content-Type': 'application/json'
				}
			});
			console.log(res);
		} catch (error) {
			console.log(error);
			let dexie_prefs = (await dexieDB.prefs.toArray()).at(0);
			if (dexie_prefs) {
				if (!is_online) {
					const tmp: OfflineChangeObject[] = JSON.parse(dexie_prefs.changed_offline);
					tmp.push({
						event: 'delete',
						medium: current_medium,
						card: { id: medium_id } as mediaObject
					});
					dexie_prefs.changed_offline = JSON.stringify(tmp);
				}
				dexie_prefs.updated_at = sync_timestamp.toISOString();
				await dexieDB.prefs.update(0, dexie_prefs);
			}
		}
		if (current_mode == 0) {
			await refreshCardList(current_year);
		} else {
			await refreshCardList('Gesamt');
			years_in_db = years_in_db.slice(-1);
		}
	}

	function getMediaCodeString(): string {
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
			case 2:
				return 'Statistiken';
			default:
				return 'ERROR';
		}
	}

	function getMediaCodeIndex(): number {
		switch (current_medium) {
			case 'games':
				return 0;
			case 'movies':
				return 1;
			case 'shows':
				return 2;
			case 'books':
				return 3;
			default:
				return -1;
		}
	}
</script>

<svelte:head>
	<title>Media-Logging</title>
</svelte:head>

<div class="flex flex-col h-screen">
	<TopBar
		on:switch_medium={handleMediaSwitch}
		on:switch_mode={handleModeSwitch}
		on:filter={handleFilter}
		header={header_text}
		settings_button={true}
		nav_back_button={false}
		static_header={false}
		tab_index={current_tab_index}
		{current_mode}
		{own_profile}
	></TopBar>
	<div bind:this={carousel} on:scroll={handleMediaSwitch} class="carousel h-full">
		<div class="carousel-item w-full">
			<CardList
				{own_profile}
				media_data={media_data[0]}
				current_medium={'games'}
				{current_mode}
				on:delete={deleteMedium}
				on:refresh={() => refreshCardList(current_year)}
				on:swipe={handleMediaSwitch}
			></CardList>
		</div>
		<div class="carousel-item w-full">
			<CardList
				{own_profile}
				media_data={media_data[1]}
				current_medium={'movies'}
				{current_mode}
				on:delete={deleteMedium}
				on:refresh={() => refreshCardList(current_year)}
				on:swipe={handleMediaSwitch}
			></CardList>
		</div>
		<div class="carousel-item w-full">
			<CardList
				{own_profile}
				media_data={media_data[2]}
				current_medium={'shows'}
				{current_mode}
				on:delete={deleteMedium}
				on:refresh={() => refreshCardList(current_year)}
				on:swipe={handleMediaSwitch}
			></CardList>
		</div>
		<div class="carousel-item w-full">
			<CardList
				{own_profile}
				media_data={media_data[3]}
				current_medium={'books'}
				{current_mode}
				on:delete={deleteMedium}
				on:refresh={() => refreshCardList(current_year)}
				on:swipe={handleMediaSwitch}
			></CardList>
		</div>
	</div>
	{#if current_mode != 2}
		<button
			on:click={() => {
				search_val = '';
				selected_date = new Date();
				search_modal.checked = true;
				current_suggestions = [];
			}}
			class="btn btn-neutral-content shadow-lg shadow-base-300 absolute bottom-[8%] inset-x-0 mx-3 min-h-[5%] h-[4%] font-bold text-2xl"
		>
			+
		</button>
	{/if}

	<YearBar on:switch={handleYearSwitch} years={years_in_db}></YearBar>

	<!-- Modals from here on -->
	<!-- SearchModal -->
	<input type="checkbox" id="search_modal" class="modal-toggle" bind:this={search_modal} />
	<div class="modal" role="dialog">
		<div class="modal-box">
			{#if is_online}
				<p class=" font-bold text-lg text-center mb-3">{form_text} hinzufügen</p>
			{:else}
				<p class=" font-bold text-xl text-center mb-3">Offline Modus</p>
				<p class=" font-bold text-lg text-center mb-3">Titel manuell hinzufügen</p>
			{/if}
			<label class="input input-bordered flex items-center gap-2 mb-3">
				<input
					type="text"
					class="grow"
					placeholder="Suche"
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
				class="overflow-y-auto max-h-[50vh] scrollbar-hide"
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
								addMedium(2);
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
				{#if loading && is_online}
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
			<button
				bind:this={add_button}
				class="btn btn-neutral mt-3"
				on:click={() => {
					add_button.disabled = true;
					checkBacklog();
				}}>Hinzufügen</button
			>
		</div>
		<label class="modal-backdrop" for="date_modal">Close</label>
	</div>
	<!-- BacklogModal -->
	<input type="checkbox" id="backlog_modal" class="modal-toggle" bind:this={backlog_modal} />
	<div class="modal" role="dialog">
		<div class="modal-box flex flex-col">
			<p class="font-bold text-lg text-center mb-1">
				{last_selection.title} wurde im Backlog gefunden
			</p>
			<p class="text-center text-base font-semibold mb-3">
				Soll der Titel aus dem Backlog entfernt werden?
			</p>
			<button
				bind:this={backlog_button_1}
				class="btn btn-success mt-3"
				on:click={() => {
					backlog_button_1.disabled = true;
					addMedium(0);
				}}>Entfernen und Notizen übernehmen</button
			>
			<button
				bind:this={backlog_button_2}
				class="btn btn-warning mt-3"
				on:click={() => {
					backlog_button_2.disabled = true;
					addMedium(1);
				}}>Entfernen und Notizen verwerfen</button
			>
			<button
				bind:this={backlog_button_3}
				class="btn btn-error mt-3"
				on:click={() => {
					backlog_button_3.disabled = true;
					addMedium(2);
				}}>Nicht aus dem Backlog entfernen</button
			>
		</div>
		<label class="modal-backdrop" for="backlog_modal">Close</label>
	</div>
</div>

<style>
	:global(body) {
		--date-picker-foreground: oklch(var(--nc));
		--date-picker-background: oklch(var(--n));
	}
</style>
