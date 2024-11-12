import { Telegraf } from "telegraf";
import { saveHistory } from "../db.js";
import { config } from "dotenv";

export default class RedditHandler {
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
        this.responseHash = [];

        this.userAgent = "Mozilla/5.0";
        this.contentType = "application/json";

        this.params = "?limit=1000&sort=new";

        this.bot.action("reddit", ctx => {
            this.handleInitAction(ctx);
        });
        this.bot.command("reddit", ctx => {
            this.handleInitAction(ctx);
        });

        this.bot.action("cute", ctx => {
            this.handleMemAction(ctx, "cute.json");
        });
        this.bot.action("tech-memes", ctx => {
            this.handleMemAction(ctx, "ProgrammingHumor.json");
        });
        this.bot.action("art", ctx => {
            this.handleMemAction(ctx, "art.json");
        });
        this.bot.action("memes", ctx => {
            this.handleMemAction(ctx, "memes.json");
        });
    }

    /**
     * @param {import('telegraf').Context} ctx
     * @param {string} message
     * @returns {void}
     * @description Sends menu to user
     */
    async handleInitAction(ctx) {
        await ctx.reply("Choose", {
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: "Cute",
                            callback_data: "cute",
                        },
                        {
                            text: "TechMemes",
                            callback_data: "tech-memes",
                        },
                    ],
                    [
                        {
                            text: "Art",
                            callback_data: "art",
                        },
                        {
                            text: "NormisMemes",
                            callback_data: "memes",
                        },
                    ],
                ],
            },
        });
    }

    async fetchMeme(partOfUrl) {
        let success = false;
        let attempts = 0;
        let response;

        while (!success && attempts < this.maxAttempts) {
            response = await fetch(this.redditApiUrl + partOfUrl, {
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

    /**
     *
     * @param {import('telegraf').Context} ctx
     * @param {string} redditGroup
     */
    async handleMemAction(ctx, redditGroup) {
        const loadMsg = await ctx.reply("Processing...");
        if (!this.responseHash[ctx.from.id]) {
            this.responseHash[ctx.from.id] = [];
        }

        try {
            const data = await this.fetchMeme(redditGroup + this.params);
            const posts = data.data.children;

            let rIndex = Math.floor(Math.random() * posts.length);
            let randomPost = posts[rIndex];

            let success = true;
            for (let i = 0; i < posts.length; i++) {
                if (this.responseHash[ctx.from.id] === randomPost.data.url) {
                    rIndex = Math.floor(Math.random() * posts.length);
                    randomPost = posts[rIndex];
                    if (i === posts.length - 1) {
                        success = false;
                    }
                } else {
                    break;
                }
            }

            if (!success) {
                ctx.reply("No more memes available");
                return;
            }

            this.responseHash[ctx.from.id].push(randomPost.data.url);

            if (randomPost.data.url) {
                if (randomPost.data.post_hint === "image") {
                    await ctx.reply(randomPost.data.url);
                } else if (randomPost.data.post_hint === "video") {
                    await ctx.replyWithVideo(randomPost.data.url);
                } else if (randomPost.data.post_hint === "gif") {
                    await ctx.replyWithAnimation(randomPost.data.url);
                } else {
                    await ctx.reply(randomPost.data.url);
                }
            }

            saveHistory({
                userId: ctx.from.id,
                userInput: "Random meme",
                botResponse: randomPost?.data?.url,
            });

            await ctx.deleteMessage(loadMsg.message_id);
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
