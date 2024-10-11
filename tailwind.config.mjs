/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	theme: {
		extend: {
			colors: {
				cowhite: "#F0ECE4",
				cown: "#64574D",
				moored: {
					DEFAULT: "#FF6340",
					shadow: "#D84E2F"
				}
			}
		},
	},
	plugins: [],
}
