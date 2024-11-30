import { join } from "path";
import WorkerManager from "./workers/worker-manager.js";
import startTelegramBot from "./bots/telegram-bot.js";

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

// Create worker managers
// const telegramWorkerManager = new WorkerManager(telegramWorkerPath, config);
// const discordWorkerManager = new WorkerManager(discordWorkerPath, config);
// const slackWorkerManager = new WorkerManager(slackWorkerPath, config);

startTelegramBot(config);

// Implement periodic health check
// setInterval(() => {
//     const workers = [telegramWorkerManager, discordWorkerManager, slackWorkerManager];
//     workers.forEach(worker => {
//         worker.postMessage({ type: "healthCheck" });
//     });
// }, 60000);
