/**
 * @fileoverview Telegram bot that processes document files and interacts with Claude AI
 * @requires telegraf
 * @requires @anthropic-ai/sdk
 * @requires officeparser
 * @requires dotenv
 */

import { Telegraf } from "telegraf";
import { message } from "telegraf/filters";
import dotenv from "dotenv";
import Anthropic from "@anthropic-ai/sdk";
import { insertHistory, db } from "./db.js";
import { parseOfficeAsync } from "officeparser";

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
 * @type {Object.<number, {fileId: string, fileType: string}>}
 * @description Stores temporary message data indexed by user ID
 */
const messageHash = {};

bot.start(ctx => {
    sendMenu(ctx);
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

/**
 * Handles action mem from reddit
 * @param {import('telegraf').Context} ctx - Telegram context
 * @description Sends a random meme from Reddit
 * @returns {Promise<void>}
 */
bot.action("mem", async ctx => {
    ctx.reply("Processing...");
    try {
        let success = false;
        let attempts = 0;

        let response;
        while (!success && attempts < 5) {
            response = await fetch(
                "https://www.reddit.com/r/ProgrammerHumor.json?limit=1000&sort=new",
                {
                    method: "GET",
                    headers: {
                        "User-Agent": "Mozilla/5.0",
                        "Content-Type": "application/json",
                    },
                }
            );
            if (response.ok) {
                success = true;
            }
            attempts++;
        }

        if (!response.ok) {
            ctx.reply("Failed to fetch meme");

            insertHistory({
                userId: ctx.from.id,
                userInput: "Failed to fetch meme",
                botResponse: "Failed to fetch meme",
            });

            return sendMenu(ctx, "Here we go again.");
        }
        const data = await response.json();

        const posts = data.data.children;
        const randomPost = posts[Math.floor(Math.random() * posts.length)];

        if (randomPost.data.url) {
            ctx.reply(randomPost.data.url);
        }

        insertHistory({
            userId: ctx.from.id,
            userInput: "Random meme",
            botResponse: randomPost.data.url,
        });

        return sendMenu(ctx, "Continue");
    } catch (error) {
        ctx.reply("Failed to fetch meme");
    }
});

/**
 * Handles the "lazywtf" callback action
 * Sets up document and text message handlers
 */
bot.action("lazywtf", ctx => {
    ctx.reply("Send me a file. (.docx, .txt, .xlsx)");

    /**
     * Handles document messages
     * @param {import('telegraf').Context} ctx - Telegram context
     */
    bot.on(message("document"), ctx => {
        const fileType = ctx.message.document.mime_type;
        const validTypes = [
            "text/plain",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ];

        if (!validTypes.includes(fileType)) {
            ctx.reply("Invalid file type. Please send a .txt, .pdf, .docx, or .doc file.");
            return sendMenu(
                ctx,
                "Interesting fact: people who send wrong file usually not read accepted formats"
            );
        }

        messageHash[ctx.from.id] = {
            fileId: ctx.message.document.file_id,
            fileType,
        };

        saveHistory({
            userId: ctx.from.id,
            userInput: "File received",
            botResponse: `File ID: ${ctx.message.document.file_id}`,
        });

        if (ctx.message.caption) {
            const userText = ctx.message.caption;
            handleFinishLazyWtf({ userText, ctx });
        } else {
            ctx.reply("File received. Now, please send me some text.");
        }
    });

    /**
     * Handles text messages
     * @param {import('telegraf').Context} ctx - Telegram context
     */
    bot.on(message("text"), async ctx => {
        const userText = ctx.message.text;
        handleFinishLazyWtf({ userText, ctx });
    });
});

/**
 * Processes file and user text, then generates AI response
 * @param {Object} params - Parameters object
 * @param {string} params.userText - Text message from user
 * @param {import('telegraf').Context} params.ctx - Telegram context
 */
const handleFinishLazyWtf = async ({ userText, ctx }) => {
    const fileData = messageHash[ctx.from.id];

    if (!fileData) {
        ctx.reply("File not found. Please send a file first.");
        return sendMenu(ctx, "bruh, you need to send file first.");
    }

    console.log(`File ID: ${fileData.fileId}`);
    console.log(`User Text: ${userText}`);

    const fileContent = await parseFile(fileData.fileId, fileData.fileType);

    console.log(`File Content: ${fileContent}`);

    saveHistory({
        userId: ctx.from.id,
        userInput: "User text received",
        botResponse: userText,
    });

    if (userText.length > 150_000) {
        return ctx.reply("Text is too long. Please send text with less than 1024 characters.");
    }

    let aiRes = "";
    try {
        ctx.reply("Processing...");

        const msg = await anthropic.messages.create({
            model: "claude-3-5-sonnet-20241022",
            max_tokens: 1024,
            messages: [
                {
                    role: "assistant",
                    content: `Be very skeptical and critical. You will be accepting 2 messages from user, 1st one is file content, second one is user text. You will be generating a response based on these 2 messages.`,
                },
                {
                    role: "user",
                    content: fileContent.slice(0, 2048),
                },
                {
                    role: "user",
                    content: userText,
                },
            ],
        });

        aiRes = msg.content[0].text;
    } catch (err) {
        console.log(err);
        saveHistory({
            userId: ctx.from.id,
            userInput: "AI error",
            botResponse: `Error: ${err.message}`,
        });
    }

    if (!aiRes) {
        ctx.reply("An error occurred. Please try again.");
        return sendMenu(ctx);
    }

    saveHistory({
        userId: ctx.from.id,
        userInput: "AI response",
        botResponse: aiRes,
    });

    ctx.reply(`AI Response: ${aiRes}`);
    sendMenu(ctx, "Congrats, you got a response.");
};

/**
 * Parses different types of files and returns their content
 * @param {string} fileId - Telegram file ID
 * @param {string} fileType - MIME type of the file
 * @returns {Promise<string>} Parsed file content
 */
const parseFile = async (fileId, fileType) => {
    try {
        const fileLink = await bot.telegram.getFileLink(fileId);
        const fileBlob = await fetch(fileLink);

        const handle = {
            /**
             * Handles text files
             * @param {Blob} fileBlob - File blob
             * @returns {Promise<string>} File content
             */
            "text/plain": async fileBlob => {
                const fileBuffer = await fileBlob.arrayBuffer();
                const fileContent = new TextDecoder().decode(fileBuffer);
                return fileContent;
            },

            /**
             * Handles DOCX files
             * @param {Blob} fileBlob - File blob
             * @returns {Promise<string>} Parsed document content
             */
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
                async fileBlob => {
                    try {
                        const buffer = await fileBlob.arrayBuffer();
                        const fileBuffer = Buffer.from(buffer);
                        const data = await parseOfficeAsync(fileBuffer);
                        return data.toString();
                    } catch (error) {
                        console.error("Error parsing file:", error);
                    }
                },

            /**
             * Handles XLSX files
             * @param {Blob} fileBlob - File blob
             * @returns {Promise<string>} Parsed spreadsheet content
             */
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": async fileBlob => {
                try {
                    const buffer = await fileBlob.arrayBuffer();
                    const fileBuffer = Buffer.from(buffer);
                    const data = await parseOfficeAsync(fileBuffer);
                    return data.toString();
                } catch (error) {
                    console.error("Error parsing file:", error);
                }
            },
        };

        if (handle[fileType]) {
            return handle[fileType](fileBlob);
        } else {
            throw new Error("Unsupported file type.");
        }
    } catch (err) {
        console.log(err);
    }
};

/**
 * Saves interaction history to database
 * @param {Object} args - History entry parameters
 * @param {number} args.userId - Telegram user ID
 * @param {string} args.userInput - User's input
 * @param {string} args.botResponse - Bot's response
 */
const saveHistory = args => insertHistory(args, db);

bot.launch();
