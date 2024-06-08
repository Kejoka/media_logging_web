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

	let cardIndex = 0;
	let topCard: HTMLElement;
	let currentZ = 100000;

	onMount(async () => {
		card1Data = cardData(cardIndex++);
		card2Data = cardData(cardIndex++);

		[card1, card2].forEach(function (el) {
			el.style.zIndex = currentZ.toString();
			currentZ--;

			new DragGesture(el, (state) => {
				onDrag(el, state);
			});
		});

		topCard = card1;
		container.classList.remove('hidden');
	});

	const cardSwiped = (el: HTMLElement, velocity: [number, number], movement: [number, number]) => {
		// move card out of the view
		el.classList.add('transition-transform', 'duration-300');

		let direction: Direction;
		if(Math.abs(movement[0]) > Math.abs(movement[1])) {
			direction = movement[0] > 0 ? 'right' : 'left';
		} else {
			direction = movement[1] < 0 ? 'up' : 'right';
		}

		let data = el === card1 ? card1Data : card2Data;
		dispatch('swiped', { direction, element: el, data, index: cardIndex - 2 });

		if (direction === 'up') {
			thresholdPassed = 2;
		} else {
			thresholdPassed = movement[0] > 0 ? 1 : -1;
		}
		
		let moveOutWidth = document.body.clientWidth;



		let endX = direction === 'up' ? 0 : Math.max(Math.abs(velocity[0]) * moveOutWidth, moveOutWidth);
		let toX = direction === 'left' ? -endX : direction === 'up'? 0 : endX;
		let endY = direction === 'up' ? -Math.abs(velocity[1]) * moveOutWidth : Math.abs(velocity[1] * moveOutWidth);
		let toY = direction === 'up' ? -endY : endY;

		let rotate = movement[0] * 0.03 * (movement[1] / 80);

		el.style.transform = `translate(${toX}px, ${toY + movement[1]}px) rotate(${rotate}deg)`;

		setTimeout(() => {
			thresholdPassed = 0;

			// move card back to start position at bottom of stack and update data
			if (el === card1) {
				card1Data = {};
				card1Data = cardData(cardIndex++);
				topCard = card2;
			} else {
				card2Data = {};
				card2Data = cardData(cardIndex++);
				topCard = card1;
			}

			currentZ--;
			el.style.zIndex = currentZ.toString();

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
		let elWidth = el.offsetWidth;
		let elHeight = el.offsetHeight;

		if (state.pressed) {
			let rotate = state.movement[0] * 0.03 * (state.movement[1] / 80);

			el.style.transform = `translate(${state.movement[0]}px, ${state.movement[1]}px) rotate(${rotate}deg)`;

			if (Math.abs(state.movement[0]) / elWidth > minSwipeDistance || Math.abs(state.movement[1]) / elHeight > minSwipeDistance) {
				thresholdPassed = state.movement[0] > 0 ? 1 : state.movement[1] < 0 ? -2 : -1;
			} else {
				thresholdPassed = 0;
			}
			return;
		}
		// if dragging is finished
		let keep =
			Math.abs(state.movement[0]) / elWidth < minSwipeDistance &&
			Math.abs(state.velocity[0]) < minSwipeVelocity &&
			Math.abs(state.movement[1]) / elHeight < minSwipeDistance &&
        	Math.abs(state.velocity[1]) < minSwipeVelocity;

		if (keep) {
			thresholdPassed = 0;
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
		if (thresholdPassed !== 0) return;

		let dir = direction === 'left' ? -1 : 1;
		if (direction === 'up') {
			cardSwiped(topCard, [0, -1], [0, -1]);
		} else {
			cardSwiped(topCard, [dir, 0.1], [dir, 1]);
		}
		
	};

	export let cardData: (index: number) => CardData;

	export let minSwipeDistance: number = 0.5;
	export let minSwipeVelocity: number = 0.5;

	export let arrowKeys = true;

	export let thresholdPassed = 0;
</script>

<svelte:body
	on:keydown={(e) => {
		if (!arrowKeys) return;
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
