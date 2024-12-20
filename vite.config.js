import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import path from "path";

export default defineConfig({
    plugins: [
        svelte({
            compilerOptions: {
                runes: true, // Enable Svelte 5 runes
                // dev: process.env.NODE_ENV !== "production",
            },
        }),
    ],
    build: {
        outDir: "public",
        rollupOptions: {
            input: {
                main: "./src/frontend/main.ts",
                favicon: "./src/frontend/assets/favicon.svg",
                snowflake: "./src/frontend/assets/snow.webp",
            },
            output: {
                entryFileNames: `client.js`,
                chunkFileNames: `[name].js`,
                assetFileNames: `[name].[ext]`,
            },
        },
        emptyOutDir: true,
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src/frontend"),
        },
    },
});
