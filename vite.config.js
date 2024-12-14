import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
    plugins: [react()],
    build: {
        outDir: "public",
        rollupOptions: {
            input: {
                main: "./src/frontend/Root.tsx",
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
    compilerOptions: {
        baseUrl: ".",
        paths: {
            "@/*": ["./src/frontend*"],
        },
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src/frontend"),
        },
    },
});
