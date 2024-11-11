import { saveHistory } from "../db.js"; // Added .js extension
import { message } from "telegraf/filters";
import { parseOfficeAsync } from "officeparser";

export default class DockAsker {
    /**
     * @param {import('telegraf').Telegraf} bot - Telegraf instance
     * @param {object} anthropic - Anthropic client instance
     * @param {Function} sendMenu - Menu sending function
     * @description Handles the document parser and ai asking action
     * @constructor DockAsker
     * @returns {DockAsker}
     */
    constructor(bot, anthropic, sendMenu) {
        this.bot = bot;
        this.anthropic = anthropic;
        this.sendMenu = sendMenu;
        this.messageHash = {};
        this.setupActions();
    }

    setupActions() {
        this.bot.action("dockasker", ctx => {
            ctx.reply("Send me a file. (.docx, .txt, .xlsx)");
            this.setupMessageHandlers();
        });
    }

    setupMessageHandlers() {
        // Using one-time handlers to prevent multiple registrations
        this.bot.on(message("document"), ctx => this.handleDocumentMessage(ctx), { once: true });
        this.bot.on(message("text"), ctx => this.handleTextMessage(ctx), { once: true });
    }

    async handleDocumentMessage(ctx) {
        const fileType = ctx.message.document.mime_type;
        const validTypes = [
            "text/plain",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ];

        if (!validTypes.includes(fileType)) {
            ctx.reply("Invalid file type. Please send a .txt, .pdf, .docx, or .doc file.");
            return this.sendMenu(
                ctx,
                "Interesting fact: people who send wrong file usually not read accepted formats"
            );
        }

        this.messageHash[ctx.from.id] = {
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
            await this.handleFinishLazyWtf({ userText, ctx });
        } else {
            ctx.reply("File received. Now, please send me some text.");
        }
    }

    async handleTextMessage(ctx) {
        const userText = ctx.message.text;
        await this.handleFinishLazyWtf({ userText, ctx });
    }

    async handleFinishLazyWtf({ userText, ctx }) {
        const fileData = this.messageHash[ctx.from.id];

        if (!fileData) {
            ctx.reply("File not found. Please send a file first.");
            return this.sendMenu(ctx, "bruh, you need to send file first.");
        }

        console.log(`File ID: ${fileData.fileId}`);
        console.log(`User Text: ${userText}`);

        const fileContent = await this.parseFile(fileData.fileId, fileData.fileType);

        if (!fileContent) {
            ctx.reply("Error parsing file. Please try again.");
            return this.sendMenu(ctx);
        }

        console.log(`File Content: ${fileContent}`);

        saveHistory({
            userId: ctx.from.id,
            userInput: "User text received",
            botResponse: userText,
        });

        if (userText.length > 150_000) {
            return ctx.reply(
                "Text is too long. Please send text with less than 150,000 characters."
            );
        }

        let aiRes = "";
        try {
            await ctx.reply("Processing...");

            const msg = await this.anthropic.messages.create({
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
            console.error(err);
            saveHistory({
                userId: ctx.from.id,
                userInput: "AI error",
                botResponse: `Error: ${err.message}`,
            });
        }

        if (!aiRes) {
            ctx.reply("An error occurred. Please try again.");
            return this.sendMenu(ctx);
        }

        saveHistory({
            userId: ctx.from.id,
            userInput: "AI response",
            botResponse: aiRes,
        });

        await ctx.reply(`AI Response: ${aiRes}`);
        this.sendMenu(ctx, "Congrats, you got a response.");
    }

    async parseFile(fileId, fileType) {
        try {
            const fileLink = await this.bot.telegram.getFileLink(fileId);
            const fileBlob = await fetch(fileLink);

            const handle = {
                "text/plain": async fileBlob => {
                    const fileBuffer = await fileBlob.arrayBuffer();
                    const fileContent = new TextDecoder().decode(fileBuffer);
                    return fileContent;
                },
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
                    async fileBlob => {
                        const buffer = await fileBlob.arrayBuffer();
                        const fileBuffer = Buffer.from(buffer);
                        const data = await parseOfficeAsync(fileBuffer);
                        return data.toString();
                    },
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
                    async fileBlob => {
                        const buffer = await fileBlob.arrayBuffer();
                        const fileBuffer = Buffer.from(buffer);
                        const data = await parseOfficeAsync(fileBuffer);
                        return data.toString();
                    },
            };

            if (handle[fileType]) {
                return handle[fileType](fileBlob);
            } else {
                throw new Error("Unsupported file type.");
            }
        } catch (err) {
            console.error(err);
            return null;
        }
    }
}
