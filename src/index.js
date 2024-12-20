import { join } from "path";
import WorkerManager from "./workers/worker-manager.js";
import { startHttpServer } from "./backend/server.ts";
// import startTelegramBot from "./bots/telegram-bot.js";

// Get current directory and create worker paths
const currentDir = import.meta.dir;
const telegramWorkerPath = join(currentDir, "workers/telegram-worker.js");
const discordWorkerPath = join(currentDir, "workers/discord-worker.js");
const slackWorkerPath = join(currentDir, "workers/slack-worker.js");

// Start the workers with configuration
const config = {
    TELEGRAM_BOT_TOKEN: Bun.env.TELEGRAM_BOT_TOKEN,
    DISCORD_BOT_TOKEN: Bun.env.DISCORD_BOT_TOKEN,
    TELEGRAM_WEBHOOK_URL: Bun.env.TELEGRAM_WEBHOOK_URL,
    SECRET_PATH: Bun.env.SECRET_PATH,
    ANTHROPIC_API_KEY: Bun.env.ANTHROPIC_API_KEY,
    OPENAI_API_KEY: Bun.env.OPENAI_API_KEY,
    type: "start",
};

// startTelegramBot(config);

// Create worker managers, each worker in the separate thread, working throw web sockets
const telegramWorkerManager = new WorkerManager(telegramWorkerPath, config);
const discordWorkerManager = new WorkerManager(discordWorkerPath, config);
const slackWorkerManager = new WorkerManager(slackWorkerPath, config);

// startTelegramBot(config);

// Http server
startHttpServer(config);
