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
                favicon: "./src/frontend/favicon.svg",
            },
            output: {
                entryFileNames: `client.js`,
                chunkFileNames: `[name].js`,
                assetFileNames: `[name].[ext]`,
            },
        },
        assetsDir: "assets",
        emptyOutDir: true,
    },
});
