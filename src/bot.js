import express from "express";
import { Telegraf } from "telegraf";
import dotenv from "dotenv";
import crypto from "crypto";
import Anthropic from "@anthropic-ai/sdk";
import ActionFabric from "./actions/actions-fabric.js";

dotenv.config();

/**
 * @type {Telegraf}
 * @description Telegram bot instance
 */
const bot = new Telegraf(process.env.BOT_TOKEN);

/**
 * @type {Anthropic}
 * @description Anthropic API client instance
 */

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

// Create an Express server
const app = express();

// Parse the raw request body before passing it to Telegraf
app.use(express.json());

// Environment variables
const PORT = process.env.PORT || 3000;
const DOMAIN = process.env.DOMAIN;
const SECRET_PATH = process.env.SECRET_PATH || crypto.randomBytes(64).toString("hex"); // Random path for webhook URL

// Webhook setup
app.get("/", (req, res) => {
    res.send("Telegram Bot Webhook Server is running!");
});

// Handle webhook requests
app.post(`/webhook/${SECRET_PATH}`, (req, res) => {
    bot.handleUpdate(req.body, res);
});

// Setup webhook on server start
const setupWebhook = async () => {
    try {
        // Remove any existing webhook
        await bot.telegram.deleteWebhook();

        // Set the new webhook
        const webhookUrl = `${DOMAIN}/webhook/${SECRET_PATH}`;
        await bot.telegram.setWebhook(webhookUrl, {
            // Drop pending updates
            drop_pending_updates: true,
            // Only allow webhook requests from Telegram IPs
            allowed_updates: ["message", "callback_query"],
        });

        console.log("Webhook set successfully!");
        console.log(`Webhook URL: ${webhookUrl}`);

        // Get webhook info
        const webhookInfo = await bot.telegram.getWebhookInfo();

        console.log("Webhook Info:", webhookInfo);
    } catch (error) {
        console.error("Error setting webhook:", error);
    }
};

// Start the server
app.listen(PORT, async () => {
    console.log(`Server is running on port ${PORT}`);
    await setupWebhook();
});

// Register middleware and error handlers
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).send("Internal Server Error");
});

// Handle errors
bot.catch((err, ctx) => {
    console.error("Bot error:", err);
    ctx.reply("An error occurred while processing your request.");
});

/**
 * Sends menu with available options to the user
 * @param {import('telegraf').Context} ctx - Telegram context
 * @param {string} [text="Choose options bellow."] - Optional custom message
 */
const sendMenu = (ctx, text = "Choose options bellow.") => {
    ctx.reply(text, {
        reply_markup: {
            inline_keyboard: [
                [
                    {
                        text: "AI halp please",
                        callback_data: "lazywtf",
                    },
                    {
                        text: "Random meme",
                        callback_data: "mem",
                    },
                ],
            ],
        },
    });
};

/**
 * @description add menu to the bot
 */
bot.telegram.setMyCommands([
    { command: "/help", description: "Get help" },
    { command: "/start", description: "Start the bot" },
]);

// Register commands
bot.command("start", ctx => {
    ctx.reply("Welcome to the bot!");
    sendMenu(ctx, "Choose options bellow.");
});

/**
 * Handles the "/help" command
 * @param {import('telegraf').Context} ctx - Telegram context
 * @description Sends help message to the user
 * @returns {Promise<void>}
 */
bot.command("help", ctx => {
    ctx.reply(
        "This bot can generate AI responses based on text and document files. To get started, send a file and then some text."
    );
    sendMenu(ctx);
});

// Create actions
ActionFabric.bot = bot;
ActionFabric.anthropic = anthropic;
ActionFabric.sendMenu = sendMenu;

ActionFabric.createAction("mem");
ActionFabric.createAction("lazywtf");

export { bot, anthropic, sendMenu };
