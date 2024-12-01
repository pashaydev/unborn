import { Telegraf } from "telegraf";
import ActionManager from "../actions/actions-manager.js";
import { parentPort } from "worker_threads";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import UserManager from "../user-manager.js";
import { commands } from "../commands.js";
import { databaseManager } from "../database/db.js";

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

    const initializeBotHandlers = async () => {
        let cmds = [];
        try {
            const db = await databaseManager.getDatabase();

            if (db) {
                const { data, error } = await db.from("commands").select("*");
                if (error) throw new Error("Error request to database");
                cmds = data;
                console.log("Get commands was successful", data);
            } else {
                cmds = commands;
            }
        } catch (err) {
            console.error("Error initialize bot handlers: ", err);
            cmds = commands;
        }
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
