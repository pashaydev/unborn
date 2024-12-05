import { AttachmentBuilder } from "discord.js";
import { databaseManager, saveHistory } from "../database/db.js";

import fs from "node:fs";
import axios from "axios";
import FormData from "form-data";

export default class ImagegenHandler {
    constructor(args) {
        for (const key in args) {
            this[key] = args[key];
        }
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
    }

    async handleDiscordSlashCommand(interaction, actionName) {
        const userId = interaction.user.id;
        const inputText = interaction.options.getString("input");

        try {
            const context = {
                from: {
                    id: userId,
                },

                reply: async message => {
                    try {
                        await interaction.channel.send(message);
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
    }

    async handleTextMessage(ctx) {
        const text = ctx.message.text;
        const userId = ctx.from.id;

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
    }

    /**
     * @param {import('telegraf').Context} ctx
     * @param {string} message
     * @returns {void}
     */
    async handleInitAction(ctx) {
        await ctx.reply("Enter text to generate an image");
    }

    /**
     * @param {import('telegraf').Context} ctx
     * @returns {Promise<void>}
     * @description Creates an image using the Stability API
     */
    async handleGenerateImage(ctx, text) {
        try {
            const userId = ctx.from.id;
            const db = await databaseManager.getDatabase();
            const { data } = await db
                .from("interactions")
                .select("*")
                .eq("action_name", "imagegen")
                .eq("user_id", userId)
                .single();

            const commandCount = data?.count;

            console.log("NODE ENV: ", Bun.env.NODE_ENV);
            if (Bun.env.NODE_ENV !== "development")
                if (commandCount > 1) return ctx.reply("You reach your limit for that interaction");

            const payload = {
                prompt: text,
                output_format: "webp",
            };

            const url = `https://api.stability.ai/v2beta/stable-image/generate/core`;

            const response = await axios.postForm(url, axios.toFormData(payload, new FormData()), {
                validateStatus: undefined,
                responseType: "arraybuffer",
                headers: {
                    Authorization: `Bearer ${Bun.env.STABLE_DIFFUSION_API_KEY}`,
                    Accept: "image/*",
                },
            });

            if (response.status !== 200) {
                const error = `${response.status}: ${response.data.toString()}`;

                console.error("API Error:", error);

                saveHistory({
                    userId: userId,
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

            const imageBuffer = Buffer.from(response.data);
            await ctx.replyWithPhoto({ source: imageBuffer });

            saveHistory({
                userId: ctx.userId,
                botResponse:
                    "User: " +
                    ctx.from.username +
                    " Stable diffusion: Image generated successfully",
                userInput: text,
            });

            const { data: dataUpdate, error } = await db
                .from("interactions")
                .upsert({
                    user_id: userId,
                    count: (commandCount || 1) + 1,
                    action_name: "imagegen",
                })
                .eq("user_id", userId);

            if (dataUpdate) console.log("Update user: ", dataUpdate);
        } catch (error) {
            console.error("Error:", error);
            await ctx.reply("An error occurred while generating the image");
        }
    }
}
