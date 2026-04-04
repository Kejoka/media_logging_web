<script lang="ts">
	import { onDestroy, onMount, tick } from 'svelte';

	export let value: Date = new Date();
	export let min: Date = new Date(1888, 9, 14);
	export let max: Date = new Date();
	export let label = 'Datum';
	export let className = '';

	const ITEM_HEIGHT = 36;
	let dayScroller: HTMLDivElement;
	let monthScroller: HTMLDivElement;
	let yearScroller: HTMLDivElement;

	let selectedYear = new Date().getFullYear();
	let selectedMonth = new Date().getMonth();
	let selectedDay = new Date().getDate();
	let yearScrollTimeout: ReturnType<typeof setTimeout> | null = null;
	let monthScrollTimeout: ReturnType<typeof setTimeout> | null = null;
	let dayScrollTimeout: ReturnType<typeof setTimeout> | null = null;

	const monthNames = [
		'Januar',
		'Februar',
		'März',
		'April',
		'Mai',
		'Juni',
		'Juli',
		'August',
		'September',
		'Oktober',
		'November',
		'Dezember'
	];

	$: minDate = new Date(min.getFullYear(), min.getMonth(), min.getDate());
	$: maxDate = new Date(max.getFullYear(), max.getMonth(), max.getDate());
	$: if (maxDate < minDate) {
		maxDate = new Date(minDate);
	}

	$: years = Array.from(
		{ length: maxDate.getFullYear() - minDate.getFullYear() + 1 },
		(_, index) => minDate.getFullYear() + index
	);

	$: months = getMonthOptions(selectedYear);
	$: days = getDayOptions(selectedYear, selectedMonth);
	$: {
		const externalDate = clampDate(value);
		if (
			externalDate.getFullYear() !== selectedYear ||
			externalDate.getMonth() !== selectedMonth ||
			externalDate.getDate() !== selectedDay
		) {
			selectedYear = externalDate.getFullYear();
			selectedMonth = externalDate.getMonth();
			selectedDay = externalDate.getDate();
			void tick().then(syncAllScrollers);
		}
	}

	onMount(() => {
		const safe = clampDate(value);
		selectedYear = safe.getFullYear();
		selectedMonth = safe.getMonth();
		selectedDay = safe.getDate();
		void tick().then(syncAllScrollers);
	});

	onDestroy(() => {
		if (yearScrollTimeout) {
			clearTimeout(yearScrollTimeout);
		}
		if (monthScrollTimeout) {
			clearTimeout(monthScrollTimeout);
		}
		if (dayScrollTimeout) {
			clearTimeout(dayScrollTimeout);
		}
	});

	function clampDate(date: Date): Date {
		const normalized = new Date(date.getFullYear(), date.getMonth(), date.getDate());
		if (normalized < minDate) {
			return new Date(minDate);
		}
		if (normalized > maxDate) {
			return new Date(maxDate);
		}
		return normalized;
	}

	function getMonthOptions(year: number): number[] {
		let start = 0;
		let end = 11;
		if (year === minDate.getFullYear()) {
			start = minDate.getMonth();
		}
		if (year === maxDate.getFullYear()) {
			end = maxDate.getMonth();
		}
		return Array.from({ length: end - start + 1 }, (_, index) => start + index);
	}

	function getDayOptions(year: number, month: number): number[] {
		let start = 1;
		let end = new Date(year, month + 1, 0).getDate();
		if (year === minDate.getFullYear() && month === minDate.getMonth()) {
			start = minDate.getDate();
		}
		if (year === maxDate.getFullYear() && month === maxDate.getMonth()) {
			end = maxDate.getDate();
		}
		return Array.from({ length: end - start + 1 }, (_, index) => start + index);
	}

	function setToday() {
		const today = clampDate(new Date());
		selectedYear = today.getFullYear();
		selectedMonth = today.getMonth();
		selectedDay = today.getDate();
		void tick().then(syncAllScrollers);
		applyCurrentSelection();
	}

	function applyCurrentSelection() {
		value = clampDate(new Date(selectedYear, selectedMonth, selectedDay));
	}

	function syncAllScrollers() {
		syncScroller(yearScroller, years.indexOf(selectedYear));
		syncScroller(monthScroller, months.indexOf(selectedMonth));
		syncScroller(dayScroller, days.indexOf(selectedDay));
	}

	function syncScroller(scroller: HTMLDivElement | undefined, index: number) {
		if (!scroller || index < 0) {
			return;
		}
		scroller.scrollTo({ top: index * ITEM_HEIGHT, behavior: 'auto' });
	}

	function settleScroller(
		scroller: HTMLDivElement | undefined,
		length: number,
		onSettled: (index: number) => void
	) {
		if (!scroller || length === 0) {
			return;
		}
		const rawIndex = Math.round(scroller.scrollTop / ITEM_HEIGHT);
		const clampedIndex = Math.max(0, Math.min(rawIndex, length - 1));
		scroller.scrollTo({ top: clampedIndex * ITEM_HEIGHT, behavior: 'smooth' });
		onSettled(clampedIndex);
	}

	function handleYearScroll() {
		if (yearScrollTimeout) {
			clearTimeout(yearScrollTimeout);
		}
		yearScrollTimeout = setTimeout(() => {
			settleScroller(yearScroller, years.length, (index) => {
				const next = years[index];
				if (next !== undefined) {
					selectedYear = next;
					if (!months.includes(selectedMonth)) {
						selectedMonth = months[0];
					}
					if (!days.includes(selectedDay)) {
						selectedDay = days[days.length - 1] || 1;
					}
					void tick().then(syncAllScrollers);
					applyCurrentSelection();
				}
			});
		}, 80);
	}

	function handleMonthScroll() {
		if (monthScrollTimeout) {
			clearTimeout(monthScrollTimeout);
		}
		monthScrollTimeout = setTimeout(() => {
			settleScroller(monthScroller, months.length, (index) => {
				const next = months[index];
				if (next !== undefined) {
					selectedMonth = next;
					if (!days.includes(selectedDay)) {
						selectedDay = days[days.length - 1] || 1;
					}
					void tick().then(syncAllScrollers);
					applyCurrentSelection();
				}
			});
		}, 80);
	}

	function handleDayScroll() {
		if (dayScrollTimeout) {
			clearTimeout(dayScrollTimeout);
		}
		dayScrollTimeout = setTimeout(() => {
			settleScroller(dayScroller, days.length, (index) => {
				const next = days[index];
				if (next !== undefined) {
					selectedDay = next;
					applyCurrentSelection();
				}
			});
		}, 80);
	}
</script>

<div class={`rounded-xl border border-base-content/10 bg-base-200/35 p-2 ${className}`}>
	<div class="mb-1 flex items-center justify-between px-1">
		<div class="flex min-w-0 flex-col">
			<p class="text-sm font-medium">{label}</p>
		</div>
		<button type="button" class="btn btn-square w-fit rounded-lg px-2 btn-xs" on:click={setToday}
			>Heute</button
		>
	</div>
	<div class="wheel-frame relative grid grid-cols-3 gap-1">
		<div class="wheel-col" bind:this={dayScroller} on:scroll={handleDayScroll}>
			{#each days as day}
				<div class="wheel-item">{day}</div>
			{/each}
		</div>
		<div class="wheel-col" bind:this={monthScroller} on:scroll={handleMonthScroll}>
			{#each months as month}
				<div class="wheel-item">{monthNames[month]}</div>
			{/each}
		</div>
		<div class="wheel-col" bind:this={yearScroller} on:scroll={handleYearScroll}>
			{#each years as year}
				<div class="wheel-item">{year}</div>
			{/each}
		</div>
		<div class="wheel-focus" aria-hidden="true"></div>
	</div>
</div>

<style>
	.wheel-frame {
		position: relative;
		height: 132px;
		overflow: hidden;
	}

	/* Dimmt obere/untere Bereiche, Mitte bleibt klar */
	.wheel-frame::before {
		content: '';
		position: absolute;
		inset: 0;
		pointer-events: none;
		z-index: 1;
		background: linear-gradient(
			to bottom,
			color-mix(in oklab, var(--color-base-200) 85%, transparent) 0%,
			color-mix(in oklab, var(--color-base-200) 75%, transparent) 28%,
			transparent 44%,
			transparent 56%,
			color-mix(in oklab, var(--color-base-200) 75%, transparent) 72%,
			color-mix(in oklab, var(--color-base-200) 85%, transparent) 100%
		);
	}

	.wheel-col {
		height: 132px;
		overflow-y: auto;
		scroll-snap-type: y mandatory;
		padding: 48px 0;
		overscroll-behavior: contain;
		touch-action: pan-y;
		-ms-overflow-style: none;
		scrollbar-width: none;

		/* zusätzliche weiche Opacity-Absenkung oben/unten */
		-webkit-mask-image: linear-gradient(
			to bottom,
			transparent 0%,
			rgba(0, 0, 0, 0.45) 20%,
			rgba(0, 0, 0, 1) 42%,
			rgba(0, 0, 0, 1) 58%,
			rgba(0, 0, 0, 0.45) 80%,
			transparent 100%
		);
		mask-image: linear-gradient(
			to bottom,
			transparent 0%,
			rgba(0, 0, 0, 0.45) 20%,
			rgba(0, 0, 0, 1) 42%,
			rgba(0, 0, 0, 1) 58%,
			rgba(0, 0, 0, 0.45) 80%,
			transparent 100%
		);
	}

	.wheel-col::-webkit-scrollbar {
		display: none;
	}

	.wheel-item {
		height: 36px;
		line-height: 36px;
		scroll-snap-align: center;
		text-align: center;
		font-size: 0.9rem;
		font-weight: 500;
		transition:
			opacity 0.15s ease,
			transform 0.15s ease;
	}

	/* Fokusfenster stärker hervorheben */
	.wheel-focus {
		position: absolute;
		left: 0;
		right: 0;
		top: 50%;
		height: 36px;
		transform: translateY(-50%);
		z-index: 2;
		background: color-mix(in oklab, var(--color-base-100) 30%, transparent);
		box-shadow:
			0 0 0 1px color-mix(in oklab, var(--color-base-content) 10%, transparent) inset,
			0 2px 10px color-mix(in oklab, var(--color-base-content) 8%, transparent);
		pointer-events: none;
	}
</style>
