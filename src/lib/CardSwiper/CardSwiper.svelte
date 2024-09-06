<script lang="ts">
	import { onMount } from 'svelte';
	import { DragGesture, type FullGestureState } from '@use-gesture/vanilla';
	import type { CardData, Direction } from '.';
	import Card from './Card.svelte';

	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();

	let container: HTMLElement;

	let card1: HTMLElement, card2: HTMLElement;
	let card1Data: CardData, card2Data: CardData;

	let card_index = 0;
	let top_card: HTMLElement;
	let current_z = 100000;

	onMount(async () => {
		card1Data = card_data(card_index++);
		card2Data = card_data(card_index++);

		[card1, card2].forEach(function (el) {
			el.style.zIndex = current_z.toString();
			current_z--;

			new DragGesture(el, (state) => {
				onDrag(el, state);
			});
		});

		top_card = card1;
		container.classList.remove('hidden');
	});

	const cardSwiped = (el: HTMLElement, velocity: [number, number], movement: [number, number]) => {
		// move card out of the view
		el.classList.add('transition-transform', 'duration-300');

		let direction: Direction;
		if (Math.abs(movement[0]) > Math.abs(movement[1])) {
			direction = movement[0] > 0 ? 'right' : 'left';
		} else {
			direction = 'up';
		}

		let data = el === card1 ? card1Data : card2Data;
		dispatch('swiped', { direction, element: el, data, index: card_index - 2 });

		if (direction === 'up') {
			threshold_passed = 2;
		} else {
			threshold_passed = movement[0] > 0 ? 1 : -1;
		}

		let move_out_width = document.body.clientWidth;

		let end_x =
			direction === 'up' ? 0 : Math.max(Math.abs(velocity[0]) * move_out_width, move_out_width);
		let to_x = direction === 'left' ? -end_x : direction === 'up' ? 0 : end_x;
		let end_y =
			direction === 'up'
				? -Math.abs(velocity[1]) * move_out_width
				: Math.abs(velocity[1] * move_out_width);
		let to_y = direction === 'up' ? end_y : -end_y;

		let rotate = movement[0] * 0.03 * (movement[1] / 80);

		el.style.transform = `translate(${to_x}px, ${to_y + movement[1]}px) rotate(${rotate}deg)`;

		setTimeout(() => {
			threshold_passed = 0;

			// move card back to start position at bottom of stack and update data
			if (el === card1) {
				card1Data = {};
				card1Data = card_data(card_index++);
				top_card = card2;
			} else {
				card2Data = {};
				card2Data = card_data(card_index++);
				top_card = card1;
			}

			current_z--;
			el.style.zIndex = current_z.toString();

			el.classList.remove('transition-transform', 'duration-300');
			el.style.transform = '';
		}, 350);
	};

	const onDrag = (
		el: HTMLElement,
		state: Omit<FullGestureState<'drag'>, 'event'> & {
			event: PointerEvent | MouseEvent | TouchEvent | KeyboardEvent;
		}
	) => {
		let el_width = el.offsetWidth;
		let el_height = el.offsetHeight;

		if (state.pressed) {
			let rotate = state.movement[0] * 0.03 * (state.movement[1] / 80);

			el.style.transform = `translate(${state.movement[0]}px, ${state.movement[1]}px) rotate(${rotate}deg)`;

			if (
				Math.abs(state.movement[0]) / el_width > min_swipe_distance ||
				Math.abs(state.movement[1]) / el_height > min_swipe_distance
			) {
				threshold_passed = state.movement[0] > 0 ? 1 : state.movement[1] < 0 ? -2 : -1;
			} else {
				threshold_passed = 0;
			}
			return;
		}
		// if dragging is finished
		let keep =
			Math.abs(state.movement[0]) / el_width < min_swipe_distance &&
			Math.abs(state.velocity[0]) < minwipe_velocity &&
			Math.abs(state.movement[1]) / el_height < min_swipe_distance &&
			Math.abs(state.velocity[1]) < minwipe_velocity;

		if (keep) {
			threshold_passed = 0;
			el.classList.add('transition-transform', 'duration-300');
			el.style.transform = '';
			setTimeout(() => {
				el.classList.remove('transition-transform', 'duration-300');
			}, 300);
		} else {
			cardSwiped(el, state.velocity, state.movement);
		}
	};

	export const swipe = (direction: Direction = 'right') => {
		if (threshold_passed !== 0) return;

		if (direction === 'up') {
			cardSwiped(top_card, [0, -1], [0, -1]);
		} else if (direction === 'left') {
			cardSwiped(top_card, [-1, 0.1], [-1, 0.1]);
		} else {
			cardSwiped(top_card, [1, 0.1], [1, 0.1]);
		}
	};

	export let card_data: (index: number) => CardData;

	export let min_swipe_distance: number = 0.5;
	export let minwipe_velocity: number = 0.5;

	export let arrow_keys = true;

	export let threshold_passed = 0;
</script>

<svelte:body
	on:keydown={(e) => {
		if (!arrow_keys) return;
		if (e.key === 'ArrowLeft') {
			swipe('left');
		} else if (e.key === 'ArrowRight') {
			swipe('right');
		} else if (e.key === 'ArrowUp') {
			swipe('up');
		}
	}}
/>

<div class="w-full h-full">
	<div class="w-full h-full relative hidden z-0" bind:this={container}>
		<svelte:component this={Card} bind:element={card1} {...card1Data} />
		<svelte:component this={Card} bind:element={card2} {...card2Data} />
	</div>
</div>
