import { Elysia } from "elysia";
import { join } from "path";
import crypto from "crypto";
import DatabaseSaver from "./database/db-saver.js";
import { DatabaseManager } from "./database/db.js";

// Get current directory and create worker paths
const currentDir = import.meta.dir;
const telegramWorkerPath = join(currentDir, "workers/telegram-worker.js");
const discordWorkerPath = join(currentDir, "workers/discord-worker.js");

// Create workers
const telegramWorker = new Worker(telegramWorkerPath);
const discordWorker = new Worker(discordWorkerPath);

// Start the workers with configuration
const config = {
    TELEGRAM_BOT_TOKEN: Bun.env.TELEGRAM_BOT_TOKEN,
    DISCORD_BOT_TOKEN: Bun.env.DISCORD_BOT_TOKEN,
    TELEGRAM_WEBHOOK_URL: Bun.env.TELEGRAM_WEBHOOK_URL,
    SECRET_PATH: Bun.env.SECRET_PATH || crypto.randomBytes(64).toString("hex"),
    ANTHROPIC_API_KEY: Bun.env.ANTHROPIC_API_KEY,
    OPENAI_API_KEY: Bun.env.OPENAI_API_KEY,
    type: "start",
};

telegramWorker.postMessage(config);
telegramWorker.onmessage = event => {
    console.log(event.data);
};
discordWorker.postMessage(config);
discordWorker.onmessage = event => {
    console.log(event.data);
};

// Setup database
const db = new DatabaseManager();
// Setup database saver
const dbSaver = new DatabaseSaver(db);

// Setup Elysia server
const elysia = new Elysia();
const PORT = Bun.env.PORT || 3000;

elysia.post(`/webhook/${config.SECRET_PATH}`, ({ body }) => {
    telegramWorker.postMessage({ type: "update", body });
    return { status: "ok" };
});

elysia.listen(
    {
        port: PORT,
        hostname: Bun.env.NODE_ENV === "production" ? "0.0.0.0" : "",
    },
    () => {
        console.log(`Server is running on port ${PORT}!`);
    }
);
