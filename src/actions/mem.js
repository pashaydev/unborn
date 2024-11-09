import { Telegraf } from "telegraf";
import { saveHistory } from "../db.js";
import { config } from "dotenv";

export class MemeHandler {
    /**
     *
     * @param {Telegraf} bot
     * @param {string} redditApiUrl
     * @param {string} userAgent
     * @param {string} contentType
     * @param {number} maxAttempts
     */
    constructor(bot, anthropic, sendMenu) {
        this.bot = bot;
        this.anthropic = anthropic;
        this.sendMenu = sendMenu;

        config();

        this.maxAttempts = 5;
        this.redditApiUrl = process.env.REDDIT_API_URL;
        this.userAgent = "Mozilla/5.0";
        this.contentType = "application/json";

        this.bot.action("mem", ctx => this.handleMemAction(ctx));
    }

    async fetchMeme() {
        let success = false;
        let attempts = 0;
        let response;

        while (!success && attempts < this.maxAttempts) {
            response = await fetch(this.redditApiUrl, {
                method: "GET",
                headers: {
                    "User-Agent": this.userAgent,
                    "Content-Type": this.contentType,
                },
            });
            if (response.ok) {
                success = true;
            }
            attempts++;
        }

        if (!response.ok) {
            throw new Error("Failed to fetch meme");
        }

        return response.json();
    }

    async handleMemAction(ctx) {
        ctx.reply("Processing...");

        try {
            const data = await this.fetchMeme();
            const posts = data.data.children;
            const randomPost = posts[Math.floor(Math.random() * posts.length)];

            if (randomPost.data.url) {
                ctx.reply(randomPost.data.url);
            }

            saveHistory({
                userId: ctx.from.id,
                userInput: "Random meme",
                botResponse: randomPost?.data?.url,
            });

            this.sendMenu(ctx, "Continue");
        } catch (error) {
            console.error(error);

            saveHistory({
                userId: ctx.from.id,
                userInput: "",
                botResponse: `Error: ${error.message}`,
            });

            this.sendMenu(ctx, "Here we go again.");
        }
    }
}
