import { Telegraf } from "telegraf";
import { message } from "telegraf/filters";
import dotenv from "dotenv";
import Anthropic from "@anthropic-ai/sdk";
import { insertHistory, db } from "./db.js";
import { parseOfficeAsync } from "officeparser";

dotenv.config();

const bot = new Telegraf(process.env.BOT_TOKEN);

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

const sendMenu = (ctx, text = "Choose options bellow.") => {
    ctx.reply(text, {
        reply_markup: {
            inline_keyboard: [
                [
                    {
                        text: "AI halp please",
                        callback_data: "lazywtf",
                    },
                ],
            ],
        },
    });
};

bot.start(ctx => {
    sendMenu(ctx);
});

const messageHash = {};

bot.action("lazywtf", ctx => {
    ctx.reply("Send me a file. (.docx, .txt, .xlsx)");

    bot.on(message("document"), ctx => {
        // validate file type, should be a .txt, .pdf, .docx, or .doc file
        const fileType = ctx.message.document.mime_type;
        if (
            ![
                "text/plain",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            ].includes(fileType)
        ) {
            ctx.reply("Invalid file type. Please send a .txt, .pdf, .docx, or .doc file.");
            return sendMenu(
                ctx,
                "Interesting fact: people who send wrong file usually have small pp. (personal preference - not read accepted formats)"
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

        // check if text was already attached to file message
        if (ctx.message.caption) {
            const userText = ctx.message.caption;
            handleFinishLazyWtf({ userText, ctx });
        } else {
            ctx.reply("File received. Now, please send me some text.");
        }
    });

    bot.on(message("text"), async ctx => {
        const userText = ctx.message.text;
        handleFinishLazyWtf({ userText, ctx });
    });
});

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

    // check user input text length, should be less than 150_000 characters
    if (userText.length > 150_000) {
        return ctx.reply("Text is too long. Please send text with less than 1024 characters.");
    }

    let aiRes = "";
    try {
        // send a loading message
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

bot.launch();

// File parsing related functions
const parseFile = async (fileId, fileType) => {
    try {
        const fileLink = await bot.telegram.getFileLink(fileId);

        const fileBlob = await fetch(fileLink);

        const handle = {
            // txt
            "text/plain": async fileBlob => {
                const fileBuffer = await fileBlob.arrayBuffer();
                const fileContent = new TextDecoder().decode(fileBuffer);

                return fileContent;
            },
            // docx
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
                async fileBlob => {
                    try {
                        const buffer = await fileBlob.arrayBuffer();

                        const fileBuffer = Buffer.from(buffer);

                        const data = await parseOfficeAsync(fileBuffer);

                        const fileContent = data.toString();

                        return fileContent;
                    } catch (error) {
                        console.error("Error parsing file:", error);
                    }
                },
            // xlsx
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": async fileBlob => {
                try {
                    const buffer = await fileBlob.arrayBuffer();

                    const fileBuffer = Buffer.from(buffer);

                    const data = await parseOfficeAsync(fileBuffer);

                    const fileContent = data.toString();

                    return fileContent;
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

// DB related functions
const saveHistory = args => insertHistory(args, db);
