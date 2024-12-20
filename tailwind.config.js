/** @type {import('tailwindcss').Config} */
export default {
    content: ["./src/frontend/**/*.{js,ts,jsx,tsx,svelte}"],
    theme: {
        extend: {
            colors: {
                primary: "#60a5fa", // Example primary color
                "primary-foreground": "#ffffff", // Example primary foreground color
            },
            boxShadow: {
                custom: "0 4px 6px rgba(0, 0, 0, 0.1)", // Example custom shadow
            },
        },
    },
    plugins: [],
};
