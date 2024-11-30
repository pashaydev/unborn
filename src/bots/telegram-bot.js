import { Telegraf } from "telegraf";
import ActionManager from "../actions/actions-manager.js";
import { parentPort } from "worker_threads";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import UserManager from "../user-manager.js";
import { commands } from "../commands.js";

export default function startTelegramBot(config) {
    const parsedConfig = config;
    const {
        TELEGRAM_BOT_TOKEN,
        ANTHROPIC_API_KEY,
        SECRET_PATH,
        OPENAI_API_KEY,
        TELEGRAM_WEBHOOK_URL,
    } = parsedConfig;

    const anthropic = new Anthropic({
        apiKey: ANTHROPIC_API_KEY,
    });

    const openai = new OpenAI({
        apiKey: OPENAI_API_KEY,
    });

    const userManager = new UserManager();

    console.log("Telegram bot starting...", userManager);

    const sendMenu = async (
        ctx,
        text = "This bot is a collection of various actions. You can use [ / ] to see the list of available commands."
    ) => {
        await ctx.reply(text);
    };

    const telegramBot = new Telegraf(TELEGRAM_BOT_TOKEN, {
        telegram: { webhookReply: true },
    });

    const actionManager = new ActionManager({
        telegramBot,
        openai,
        anthropic,
        userManager,
        sendMenu,
    });

    // const setupWebhook = async () => {
    //     try {
    //         await telegramBot.telegram.deleteWebhook();
    //         const webhookUrl = `${TELEGRAM_WEBHOOK_URL}/webhook/${SECRET_PATH}`;
    //         await telegramBot.telegram.setWebhook(webhookUrl, {
    //             allowed_updates: ["message", "callback_query"],
    //         });
    //         console.log("Webhook set successfully!");
    //         console.log(`Webhook URL: ${webhookUrl}`);

    //         const webhookInfo = await telegramBot.telegram.getWebhookInfo();
    //         console.log("Webhook Info:", webhookInfo);

    //         return webhookUrl;
    //     } catch (error) {
    //         console.error("Error setting webhook:", error);
    //     }
    //     return "";
    // };

    const initializeBotHandlers = async () => {
        // Register commands
        await telegramBot.telegram.setMyCommands(
            commands.map(c => ({ command: c.command, description: c.description }))
        );

        telegramBot.command("start", async ctx => {
            await ctx.reply(
                "This bot is a collection of various actions. You can use [ / ] to see the list of available commands."
            );
        });

        const userManager = new UserManager();

        const actionManager = new ActionManager({
            telegramBot,
            sendMenu,
            openai,
            anthropic,
            userManager,
        });

        await actionManager.registerTelegramHandlers();

        console.log("Bot handlers have been initialized successfully!");

        // Handle errors
        telegramBot.catch((err, ctx) => {
            console.error("Bot error:", err);
            ctx.reply("An error occurred while processing your request.");
        });
    };

    // Start the Telegram bot
    const start = async () => {
        console.log("Starting Telegram bot...");
        // await setupWebhook();
        await initializeBotHandlers();
        telegramBot.launch();

        parentPort?.postMessage({ type: "ready", bot: "telegram" });
    };

    start().catch(error => {
        console.error("Telegram bot error:", error);
        parentPort?.postMessage({ type: "error", bot: "telegram", error: error.message });
    });

    return telegramBot;
}
