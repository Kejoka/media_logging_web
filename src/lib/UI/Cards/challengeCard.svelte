<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { mediaObject } from '$lib/dbUtils';
	import type { ChallengeTemplate, UserChallenge } from '$lib/types';
	import { CHALLENGE_TEMPLATES } from '$lib/types';

	export let media_data: mediaObject[];
	export let current_medium: string;
	export let current_year: string;
	export let own_profile: boolean;
	export let challenges: UserChallenge[] = [];

	const dispatch = createEventDispatcher();

	let challenge_modal: HTMLInputElement;
	let is_saving = false;
	let error_message = '';
	let edit_mode = false;
	let editing_challenge: UserChallenge | null = null;
	let form_template_id: string = '';
	let form_target_count = 10;

	$: selected_year = Number(current_year);
	$: is_year_view = !Number.isNaN(selected_year);

	$: available_templates = CHALLENGE_TEMPLATES.filter((t) => t.medium === current_medium);

	$: current_challenges = challenges.filter(
		(challenge) => challenge.medium === current_medium && challenge.year === selected_year
	);

	$: created_types = new Set(current_challenges.map((challenge) => challenge.challenge_type));

	$: available_templates_to_create = available_templates.filter((t) => !created_types.has(t.type));
	$: selected_template_for_create =
		available_templates_to_create.find((template) => template.id === form_template_id) ||
		available_templates_to_create[0] ||
		null;
	$: medium_label =
		current_medium === 'games'
			? 'Games'
			: current_medium === 'movies'
				? 'Filme'
				: current_medium === 'shows'
					? 'Serien'
					: 'Bücher';

	function getTemplateForChallenge(challenge: UserChallenge): ChallengeTemplate | null {
		return (
			available_templates.find((template) => template.type === challenge.challenge_type) || null
		);
	}

	function getProgressCount(challenge: UserChallenge): number {
		switch (challenge.challenge_type) {
			case 'pages':
				return media_data.reduce((sum, medium) => sum + Number(medium.pagecount || 0), 0);
			case 'completion':
				return media_data.filter((medium) => Number(medium.trophy || 0) > 0).length;
			case 'count':
			default:
				return media_data.length;
		}
	}

	function getProgressPercent(challenge: UserChallenge): number {
		const progressCount = getProgressCount(challenge);
		return challenge.target_count > 0 ? (progressCount / challenge.target_count) * 100 : 0;
	}

	function getProgressLabel(challenge: UserChallenge): string {
		if (challenge.challenge_type === 'pages') {
			return 'Seiten';
		}
		if (challenge.challenge_type === 'completion') {
			return 'Spiele auf 100%';
		}
		return medium_label;
	}

	function updateTargetFromTemplate() {
		if (!selected_template_for_create || edit_mode) {
			return;
		}
		form_target_count = selected_template_for_create.defaultTarget;
	}

	function openCreateModal() {
		edit_mode = false;
		editing_challenge = null;
		form_template_id = available_templates_to_create[0]?.id || '';
		updateTargetFromTemplate();
		error_message = '';
		challenge_modal.checked = true;
	}

	function openEditModal(challenge: UserChallenge) {
		if (!challenge) {
			return;
		}
		edit_mode = true;
		editing_challenge = challenge;
		form_template_id = '';
		form_target_count = challenge.target_count;
		error_message = '';
		challenge_modal.checked = true;
	}

	async function saveChallenge() {
		if (!is_year_view) {
			return;
		}
		if (!edit_mode && !selected_template_for_create) {
			error_message = 'Bitte wähle eine Challenge aus.';
			return;
		}
		if (!Number.isFinite(form_target_count) || form_target_count <= 0) {
			error_message = 'Das Ziel muss größer als 0 sein.';
			return;
		}

		const template = edit_mode
			? editing_challenge
				? getTemplateForChallenge(editing_challenge)
				: null
			: selected_template_for_create;
		if (!template || (edit_mode && !editing_challenge)) {
			error_message = 'Ungültige Challenge ausgewählt.';
			return;
		}

		is_saving = true;
		error_message = '';

		try {
			const response = await fetch('/api/v1/upsertChallenge', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					medium: current_medium,
					year: selected_year,
					challenge_type: template.type,
					label: template.label,
					target_count: Math.floor(form_target_count)
				})
			});

			if (!response.ok) {
				throw new Error(await response.text());
			}

			const challenge = (await response.json()) as UserChallenge;
			dispatch('challenge_updated', challenge);
			challenge_modal.checked = false;
			editing_challenge = null;
		} catch (error) {
			error_message = 'Challenge konnte nicht gespeichert werden.';
			console.log(error);
		} finally {
			is_saving = false;
		}
	}

	async function deleteChallenge(challenge: UserChallenge) {
		if (!challenge) {
			return;
		}

		is_saving = true;
		error_message = '';

		try {
			const response = await fetch('/api/v1/deleteChallenge', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					medium: challenge.medium,
					year: challenge.year,
					challenge_type: challenge.challenge_type
				})
			});

			if (!response.ok) {
				throw new Error(await response.text());
			}

			// Dispatch event to parent to handle removal
			dispatch('challenge_deleted', challenge);
		} catch (error) {
			error_message = 'Challenge konnte nicht gelöscht werden.';
			console.log(error);
		} finally {
			is_saving = false;
		}
	}
</script>

<div class="mx-2 mb-2 rounded-lg bg-base-100 px-4 py-4 shadow">
	{#if !is_year_view}
		<p class="text-base font-semibold">Jahres-Challenges</p>
		<p class="mt-1 text-sm opacity-70">
			Challenges sind nur in einer konkreten Jahresansicht verfügbar.
		</p>
	{:else if current_challenges.length > 0}
		<div>
			<p class="mb-2 text-base font-semibold">Jahres-Challenges</p>
			{#each current_challenges as challenge}
				<div class="mb-3 rounded bg-base-200 p-2">
					<div class="mb-1 flex items-start justify-between gap-2">
						<div>
							<p class="text-sm font-semibold">{challenge.label}</p>
							<p class="text-xs opacity-70">{getProgressLabel(challenge)}</p>
						</div>
						{#if own_profile}
							<div class="flex gap-1">
								<button class="btn btn-outline btn-xs" on:click={() => openEditModal(challenge)}>
									Bearbeiten
								</button>
								<button
									class="btn btn-outline btn-xs btn-error"
									disabled={is_saving}
									on:click={() => deleteChallenge(challenge)}
								>
									Löschen
								</button>
							</div>
						{/if}
					</div>
					<div class="mt-2">
						<div class="mb-1 flex items-center justify-between text-xs">
							<span>{getProgressCount(challenge)} / {challenge.target_count}</span>
							<span>{getProgressPercent(challenge).toFixed(1)}%</span>
						</div>
						<div class="h-2 w-full overflow-hidden rounded-full bg-base-300">
							<div
								class="h-full rounded-full bg-primary"
								style={`width: ${Math.min(getProgressPercent(challenge), 100)}%`}
							></div>
						</div>
						{#if getProgressCount(challenge) > challenge.target_count}
							<p class="mt-1 text-xs opacity-70">Geschafft!</p>
						{/if}
					</div>
				</div>
			{/each}
		</div>
		{#if available_templates_to_create.length > 0 && own_profile}
			<button class="btn mt-3 w-full btn-sm btn-secondary" on:click={openCreateModal}
				>Weitere Challenge hinzufügen
			</button>
		{/if}
	{:else}
		<p class="text-base font-semibold">Jahres-Challenges</p>
		<p class="mt-1 text-sm opacity-70">Setze dir ein Ziel für {medium_label} in {selected_year}.</p>
		{#if own_profile}
			<button class="btn mt-3 btn-sm btn-primary" on:click={openCreateModal}
				>Challenge erstellen</button
			>
		{:else}
			<p class="mt-2 text-sm opacity-70">Keine Challenges für dieses Jahr gesetzt.</p>
		{/if}
	{/if}
</div>

<input type="checkbox" class="modal-toggle" bind:this={challenge_modal} />
<div class="modal" role="dialog">
	<div class="modal-box">
		<p class="text-lg font-semibold">
			{edit_mode ? 'Challenge bearbeiten' : 'Neue Challenge erstellen'}
		</p>
		{#if !edit_mode}
			<label class="form-control mt-4">
				<div class="label">
					<span class="label-text">Challenge wählen</span>
				</div>
				{#if available_templates_to_create.length <= 1}
					<div class="rounded-lg bg-base-200 p-3 text-sm font-medium">
						{available_templates_to_create[0]?.label || 'Keine weitere Challenge verfügbar'}
					</div>
				{:else}
					<select
						class="select-bordered select"
						bind:value={form_template_id}
						on:change={updateTargetFromTemplate}
					>
						<option value="" disabled>-- Wähle eine Challenge --</option>
						{#each available_templates_to_create as template}
							<option value={template.id}>{template.label}</option>
						{/each}
					</select>
				{/if}
				{#if selected_template_for_create}
					<div class="label mt-2">
						<span class="label-text-alt">{selected_template_for_create.description}</span>
					</div>
				{/if}
			</label>
		{:else}
			<div class="mt-4 rounded-lg bg-base-200 p-3 text-sm font-medium">
				{editing_challenge?.label}
			</div>
		{/if}
		<label class="form-control mt-4">
			<div class="label">
				<span class="label-text">Ziel</span>
			</div>
			<input class="input-bordered input" type="number" min="1" bind:value={form_target_count} />
		</label>
		{#if error_message}
			<p class="mt-2 text-sm text-error">{error_message}</p>
		{/if}
		<button class="btn mt-4 btn-primary" disabled={is_saving} on:click={saveChallenge}>
			{is_saving ? 'Speichern...' : 'Speichern'}
		</button>
	</div>
	<button
		type="button"
		on:click={() => {
			challenge_modal.checked = false;
		}}
		class="modal-backdrop"
	>
		Close
	</button>
</div>
