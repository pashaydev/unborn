import { Telegraf } from "telegraf";
import dotenv from "dotenv";
import crypto from "crypto";
import Anthropic from "@anthropic-ai/sdk";
import ActionFabric from "./actions/actions-fabric.js";
import OpenAI from "openai";
import { Elysia } from "elysia";

dotenv.config();

// Create bot instance
const createBot = () => {
    const bot = new Telegraf(process.env.BOT_TOKEN);
    return bot;
};

let bot = createBot();
let anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});
let openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const elysia = new Elysia();

const PORT = process.env.PORT || 3000;
const DOMAIN = process.env.DOMAIN;
const SECRET_PATH = process.env.SECRET_PATH || crypto.randomBytes(64).toString("hex");

// Function to initialize all bot commands and listeners
const initializeBotHandlers = async () => {
    // Register commands
    await bot.telegram.setMyCommands([
        { command: "/help", description: "Get help" },
        { command: "/start", description: "Start the bot" },
        { command: "/menu", description: "Show menu" },
        { command: "/ghostwriter", description: "Generate text" },
        { command: "/imagegen", description: "Generate image" },
    ]);

    bot.command("start", async ctx => {
        await ctx.telegram.deleteMessage(ctx.chat.id, ctx.message.message_id);
        sendMenu(ctx, "Choose options bellow.");
    });

    bot.command("menu", ctx => {
        sendMenu(ctx);
    });

    bot.command("help", async ctx => {
        await ctx.reply(
            "This bot is a collection of various actions. You can choose an action from the menu below."
        );
        sendMenu(ctx);
    });

    // Recreate actions
    ActionFabric.bot = bot;
    ActionFabric.anthropic = anthropic;
    ActionFabric.sendMenu = sendMenu;
    ActionFabric.openai = openai;

    ActionFabric.createAction("reddit");
    ActionFabric.createAction("dockasker");
    ActionFabric.createAction("chess");
    ActionFabric.createAction("ghostwriter");
    ActionFabric.createAction("imagegen");

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
        bot = createBot();

        // Initialize all handlers
        initializeBotHandlers();

        // Setup webhook for the new instance
        const webhookUrl = await setupWebhook();

        bot.start({
            webhook: {
                domain: webhookUrl,
                port: PORT || 3000,
                host: process.env.NODE_ENV === "production" ? "0.0.0.0" : "",
            },
        });

        console.log("Bot has been reset and reinitialized successfully!");
    } catch (error) {
        console.error("Error resetting bot:", error);
    }
};

// Modified sendMenu function
const sendMenu = (ctx, text = "Choose options bellow.") => {
    ctx.reply(text, {
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
        elysia.listen(
            {
                port: PORT,

                hostname: process.env.NODE_ENV === "production" ? "0.0.0.0" : "",
            },
            async () => {
                await resetBot();
            }
        );
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start();
