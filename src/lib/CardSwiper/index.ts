export type CardData = {
	title?: string;
	color?: string;
	description?: string;
	image?: string;
	id?: number;
};

export type Direction = 'left' | 'right' | 'up';

export { default as CardSwiper } from './CardSwiper.svelte';
