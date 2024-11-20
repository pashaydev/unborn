import { AttachmentBuilder } from "discord.js";
import { saveHistory } from "../database/db.js";
import fs from "fs";

export default class ImagegenHandler {
    /**
     *
     * @param {import('telegraf').Telegraf} bot
     * @param {function} sendMenu
     */
    constructor(args) {
        this.telegramBot = args.telegramBot;
        this.sendMenu = args.sendMenu;
        this.activeUsers = new Set();
        this.userInteractions = {};
    }

    initAction(ctx) {
        this.handleInitAction(ctx);
    }
    initCommand(ctx) {
        this.handleInitAction(ctx);
    }

    /**
     * @param {import('@slack/bolt').SlackCommandMiddlewareArgs} context - Slack
     */
    async handleSlackCommand(context) {
        const body = context.body;
        console.log("Handling slack command:", this.slackBot);
        const text = body.text;
        const userId = body.user_id;

        this.activeUsers.add(userId);

        const innerContext = {
            from: {
                id: userId,
                first_name: body.user_name,
                last_name: "",
            },
            chat: {
                id: body?.channel_id || "",
            },
            userId: userId,
            reply: async message => {
                await context.ack({
                    text: message,
                });
            },
            replyWithPhoto: async image => {
                try {
                    console.log(image, "Slack image");

                    let buffer;
                    if (typeof image.source === "string" && image.source.includes("base64")) {
                        const base64Data = image.source.split(";base64,").pop();
                        buffer = Buffer.from(base64Data, "base64");
                    } else {
                        buffer = Buffer.from(image.source, "base64");
                    }

                    // Create a readable stream from the buffer
                    const stream = require("stream");
                    const readableStream = new stream.Readable();
                    readableStream.push(buffer);
                    readableStream.push(null);

                    await this.slackBot.client.files.uploadV2({
                        channel_id: body.channel_id,
                        file: readableStream,
                        filename: "img.png",
                    });
                } catch (error) {
                    console.error("Error message:", error.message);
                    console.error("Full error:", error);
                }
            },
        };

        try {
            await this.handleGenerateImage(innerContext, text);
        } catch (error) {
            console.error("Error in ghostwriter:", error);
        }

        this.activeUsers.delete(userId);
    }

    async handleDiscordSlashCommand(interaction, actionName) {
        const userId = interaction.user.id;
        this.activeUsers.add(userId);
        const inputText = interaction.options.getString("input");

        try {
            const context = {
                from: {
                    id: userId,
                },

                reply: async message => {
                    try {
                        await interaction.deferReply();
                        await interaction.editReply(message);
                    } catch (error) {
                        console.error("Error:", error);
                    }
                },
                userId: userId,
                replyWithPhoto: async image => {
                    try {
                        const attachment = new AttachmentBuilder(image.source, "image.png");
                        await interaction.channel.send({
                            files: [attachment],
                        });

                        await interaction.editReply(inputText);
                    } catch (error) {
                        console.error("Error:", error);
                    }
                },
            };

            await this.handleGenerateImage(context, inputText);
        } catch (error) {
            console.error("Error:", error);
            await interaction.editReply("An error occurred while generating the image");
        }

        this.activeUsers.delete(userId);
    }

    async handleTextMessage(ctx) {
        const text = ctx.message.text;
        const userId = ctx.from.id;

        if (!this.activeUsers.has(userId)) {
            return;
        }

        try {
            ctx.deleteMessage(ctx.message.message_id);
        } catch {}

        const msg2 = await ctx.reply("Generating image...");

        try {
            await this.handleGenerateImage(ctx, text);
        } catch (error) {
            console.error("Error:", error);
        }

        try {
            await ctx.deleteMessage(msg2.message_id);
        } catch {}

        this.activeUsers.delete(userId);
    }

    /**
     * @param {import('telegraf').Context} ctx
     * @param {string} message
     * @returns {void}
     */
    async handleInitAction(ctx) {
        if (!this.activeUsers) {
            this.activeUsers = new Set();
        }
        const userId = ctx.from.id;

        if (this.userInteractions[userId] && this.userInteractions[userId] >= 5) {
            await ctx.reply(
                "You have reached the limit of interactions for this session. Please try again later."
            );
            return;
        }

        await ctx.reply("Enter text to generate an image");
        this.activeUsers.add(userId);
    }

    /**
     * @param {import('telegraf').Context} ctx
     * @returns {Promise<void>}
     * @description Creates an image using the Stability API
     */
    async handleGenerateImage(ctx, text) {
        try {
            const payload = {
                text_prompts: [{ text: text }],
                samples: 2,
                steps: 40,
            };

            const url = `https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image`;

            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    Authorization: `Bearer ${process.env.STABLE_DIFFUSION_API_KEY}`,
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const error = await response.json();
                console.error("API Error:", error);
                saveHistory({
                    userId: ctx.userId,
                    botResponse:
                        "Failed to generate image: " +
                        error.message +
                        " user: " +
                        ctx.from.username,
                    userInput: text,
                });
                await ctx.reply("Failed to generate image");
                return;
            }

            const responseData = await response.json();
            const base64Image = responseData.artifacts[0].base64;
            const imageBuffer = Buffer.from(base64Image, "base64");
            await ctx.replyWithPhoto({ source: imageBuffer });

            if (typeof this.userInteractions[ctx.userId] === "undefined") {
                this.userInteractions[ctx.userId] = 0;
            }

            this.userInteractions[ctx.userId]++;

            saveHistory({
                userId: ctx.userId,
                botResponse:
                    "User: " +
                    ctx.from.username +
                    " Stable diffusion: Image generated successfully",
                userInput: text,
            });
        } catch (error) {
            console.error("Error:", error);
            await ctx.reply("An error occurred while generating the image");
        }
    }
}
