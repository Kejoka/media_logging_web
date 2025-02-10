import daisyui from 'daisyui';
import containerQueries from '@tailwindcss/container-queries';
import forms from '@tailwindcss/forms';
import typography from '@tailwindcss/typography';
import type { Config } from 'tailwindcss';

/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {}
	},
	plugins: [daisyui, typography, forms, containerQueries],
	daisyui: {
		themes: false,
		darkTheme: 'dark',
		base: true,
		styled: true,
		utils: true
	}
} satisfies Config;
