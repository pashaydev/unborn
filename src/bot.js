import { Telegraf } from "telegraf";
import crypto from "crypto";
import Anthropic from "@anthropic-ai/sdk";
import ActionManager from "./actions/actions-manager.js";
import OpenAI from "openai";
import { Elysia } from "elysia";
import Bun from "bun";
import UserManager from "./user-manager.js";

let bot = new Telegraf(Bun.env.BOT_TOKEN);

let anthropic = new Anthropic({
    apiKey: Bun.env.ANTHROPIC_API_KEY,
});
let openai = new OpenAI({
    apiKey: Bun.env.OPENAI_API_KEY,
});

const elysia = new Elysia();

const PORT = Bun.env.PORT || 3000;
console.log("PORT:", PORT);
const DOMAIN = Bun.env.DOMAIN;
const SECRET_PATH = Bun.env.SECRET_PATH || crypto.randomBytes(64).toString("hex");

// Function to initialize all bot commands and listeners
const initializeBotHandlers = async () => {
    // Register commands
    await bot.telegram.setMyCommands([
        { command: "/help", description: "Get help" },
        { command: "/start", description: "Start the bot" },
        { command: "/menu", description: "Show menu" },
        { command: "/reddit", description: "Reddit interactions" },
        { command: "/ghostwriter", description: "Make polite message" },
        { command: "/ghostwriteraudio", description: "Make polite message from audio to audio" },
        {
            command: "/ghostwriterfromtexttoaudio",
            description: "Make polite message from text to audio",
        },
        { command: "/imagegen", description: "Generate image" },
        {
            command: "/scrapper",
            description: "Web scrapping across three most popular search engines",
        },
    ]);

    bot.command("start", async ctx => {
        sendMenu(ctx, "Choose options bellow.");
    });

    bot.command("menu", ctx => {
        sendMenu(ctx);
    });

    bot.command("help", async ctx => {
        await ctx.reply(
            "This bot is a collection of various actions. You can choose an action from the menu below. Or you can use [ / ] to see the list of available commands."
        );
        sendMenu(ctx);
    });

    const userManager = new UserManager();

    const actionManager = new ActionManager({
        bot,
        sendMenu,
        openai,
        anthropic,
        userManager,
    });

    console.log("Bot handlers have been initialized successfully!");

    // Handle errors
    bot.catch((err, ctx) => {
        console.error("Bot error:", err);
        ctx.reply("An error occurred while processing your request.");
    });
};

// Function to reset the bot instance and reinitialize handlers
const resetBot = async () => {
    try {
        // Stop the old bot instance
        if (bot.status == "running") {
            bot.stop();
        }

        // Create a new bot instance
        bot = new Telegraf(Bun.env.BOT_TOKEN);

        // Initialize all handlers
        initializeBotHandlers();

        // Setup webhook for the new instance
        await setupWebhook();

        console.log("Bot has been reset and reinitialized successfully!");
    } catch (error) {
        console.error("Error resetting bot:", error);
    }
};

// Modified sendMenu function
const sendMenu = async (ctx, text = "Choose options bellow.") => {
    await ctx.reply(text, {
        reply_markup: {
            inline_keyboard: [
                [
                    {
                        text: "AI docks parser",
                        callback_data: "dockasker",
                    },
                    {
                        text: "Random reddit post",
                        callback_data: "reddit",
                    },
                ],
                [
                    {
                        text: "Play chess",
                        callback_data: "chess",
                    },
                    {
                        text: "Ghostwriter",
                        callback_data: "ghostwriter",
                    },
                ],
            ],
            resize_keyboard: true,
        },
    });
};

// Webhook setup function
const setupWebhook = async () => {
    try {
        await bot.telegram.deleteWebhook();
        const webhookUrl = `${DOMAIN}/webhook/${SECRET_PATH}`;
        await bot.telegram.setWebhook(webhookUrl, {
            allowed_updates: ["message", "callback_query"],
        });
        console.log("Webhook set successfully!");
        console.log(`Webhook URL: ${webhookUrl}`);

        const webhookInfo = await bot.telegram.getWebhookInfo();
        console.log("Webhook Info:", webhookInfo);

        return webhookUrl;
    } catch (error) {
        console.error("Error setting webhook:", error);
    }
    return "";
};

bot.catch((err, ctx) => {
    console.error(`Error for ${ctx.updateType}`, err);
});

// Handle webhook requests
elysia.post(`/webhook/${SECRET_PATH}`, ({ body }) => {
    bot.handleUpdate(body);
    return { status: "ok" };
});

elysia.get("/", (req, res) => {
    res.send("Telegram Bot Webhook Server is running!");
});

elysia.onError(handler => {
    console.error(handler.error);
});

// Start server
const start = async () => {
    try {
        console.log("ENV:", Bun.env.NODE_ENV);
        elysia.listen(
            {
                port: PORT,
                hostname: Bun.env.NODE_ENV === "production" ? "0.0.0.0" : "",
            },
            async () => {
                console.log("Server is running!");
                await resetBot();
            }
        );
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

start();
