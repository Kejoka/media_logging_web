import { darkThemes } from '@supabase/auth-ui-shared';

/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {}
	},
	plugins: [
		require('daisyui')
	],
	daisyui: {
		themes: false,
		darkTheme: 'dark',
		base: true,
		styled: true,
		utils: true
	}
};
