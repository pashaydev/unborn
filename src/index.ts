import DatabaseSaver from "./database/db-saver.js";
import { DatabaseManager } from "./database/db.js";
import WorkerManager from "./workers/worker-manager.ts";

import { config } from "https://deno.land/x/dotenv@v3.2.2/mod.ts";

config({ export: true });

// const telegramWorkerPath = import.meta.resolve("./workers/telegram-worker.js");
const discordWorkerPath = import.meta.resolve("./workers/discord-worker.mts");
// const slackWorkerPath = import.meta.resolve("./workers/slack-worker.js");

// Start the workers with configuration
const configEnvs = {
    TELEGRAM_BOT_TOKEN: Deno.env.get("TELEGRAM_BOT_TOKEN"),
    DISCORD_BOT_TOKEN: Deno.env.get("DISCORD_BOT_TOKEN"),
    TELEGRAM_WEBHOOK_URL: Deno.env.get("TELEGRAM_WEBHOOK_URL"),
    SECRET_PATH: Deno.env.get("SECRET_PATH"),
    ANTHROPIC_API_KEY: Deno.env.get("ANTHROPIC_API_KEY"),
    OPENAI_API_KEY: Deno.env.get("OPENAI_API_KEY"),
    type: "start",
};

// Create worker managers
// const telegramWorkerManager = new WorkerManager(telegramWorkerPath, configEnvs);
const discordWorkerManager = new WorkerManager(discordWorkerPath, configEnvs);
// const slackWorkerManager = new WorkerManager(slackWorkerPath, configEnvs);

// Setup database
const dbManager = new DatabaseManager();
dbManager.initialize();
// Setup database saver
const dbSaver = new DatabaseSaver(dbManager);

// Implement periodic health check
setInterval(() => {
    const workers = [discordWorkerManager];
    workers.forEach(worker => {
        worker.postMessage({ type: "healthCheck" });
    });
}, 60000);
