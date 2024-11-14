import { message } from "telegraf/filters";
import { saveHistory } from "../db.js";

export default class ImagegenHandler {
    /**
     *
     * @param {import('telegraf').Telegraf} bot
     * @param {function} sendMenu
     */
    constructor(bot, sendMenu) {
        this.bot = bot;
        this.sendMenu = sendMenu;
        this.activeUsers = new Set();
        this.userInteractions = {};

        this.bot.action("imagegen", ctx => {
            this.handleInitAction(ctx);
        });
        this.bot.command("imagegen", async ctx => {
            // remove the command message
            try {
                await this.bot.telegram.deleteMessage(ctx.chat.id, ctx.message.message_id);
            } catch {}

            this.handleInitAction(ctx);
        });
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

        const msg = await ctx.reply("Enter text to generate an image");
        this.activeUsers.add(userId);

        this.bot.on(message("text"), async ctx => {
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
        });
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
                    botResponse: "Failed to generate image: " + error.message,
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
                botResponse: "Stable diffusion: Image generated successfully",
                userInput: text,
            });
        } catch (error) {
            console.error("Error:", error);
            await ctx.reply("An error occurred while generating the image");
        }
    }
}
