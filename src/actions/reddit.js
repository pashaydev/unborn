import { Telegraf } from "telegraf";
import { saveHistory } from "../db.js";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

export default class RedditHandler {
    /**
     * @param {Telegraf} telegramBot
     * @param {string} redditApiUrl
     * @param {string} userAgent
     * @param {string} contentType
     * @param {number} maxAttempts
     */
    constructor(args) {
        this.telegramBot = args.telegramBot;
        this.anthropic = args.anthropic;
        this.sendMenu = args.sendMenu;
        this.discordBot = args.discordBot;

        this.maxAttempts = 5;
        this.redditApiUrl = Bun.env.REDDIT_API_URL;
        this.responseHash = [];

        this.userAgent = "Mozilla/5.0";
        this.contentType = "application/json";

        this.params = "?limit=1000&sort=new";

        if (this.telegramBot) {
            this.telegramBot.action("reddit:cute", ctx => {
                this.handleInnerAction(ctx, "cute.json");
            });
            this.telegramBot.action("reddit:tech-memes", ctx => {
                this.handleInnerAction(ctx, "ProgrammingHumor.json");
            });
            this.telegramBot.action("reddit:art", ctx => {
                this.handleInnerAction(ctx, "art.json");
            });
            this.telegramBot.action("reddit:memes", ctx => {
                this.handleInnerAction(ctx, "memes.json");
            });
        }
    }

    initAction(ctx, action) {
        this.handleInitAction(ctx);
    }
    initCommand(ctx, action) {
        this.handleInitAction(ctx);
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
                            callback_data: "reddit:cute",
                        },
                        {
                            text: "TechMemes",
                            callback_data: "reddit:tech-memes",
                        },
                    ],
                    [
                        {
                            text: "Art",
                            callback_data: "reddit:art",
                        },
                        {
                            text: "NormisMemes",
                            callback_data: "reddit:memes",
                        },
                    ],
                ],
            },
        });
    }

    /**
     * @param {import('discord.js').CommandInteraction} interaction
     * @returns {void}
     * @description Handles discord slash command
     */
    async handleDiscordSlashCommand(interaction) {
        // send keyboard to user
        const keyboard = [
            new ButtonBuilder()
                .setCustomId("reddit:cute")
                .setLabel("Cute")
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId("reddit:tech-memes")
                .setLabel("TechMemes")
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId("reddit:art")
                .setLabel("Art")
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId("reddit:memes")
                .setLabel("NormisMemes")
                .setStyle(ButtonStyle.Secondary),
        ];

        const row1 = new ActionRowBuilder().addComponents(keyboard[0], keyboard[1]);
        const row2 = new ActionRowBuilder().addComponents(keyboard[2], keyboard[3]);
        // if (!interaction.replied && interaction.deferred) {
        // interaction.editReply("Choose");
        // }

        // if (!interaction.deferred) {
        //     await interaction.deferReply();
        // }
        interaction.editReply({
            components: [row1, row2],
            content: "Choose",
        });

        this.discordBot.on("interactionCreate", async interaction => {
            if (!interaction.isButton()) return;

            const context = {
                from: {
                    id: interaction.user.id,
                },
                reply: async message => {
                    return await interaction.channel.send(message);
                },
                replyWithVideo: async message => {
                    return await interaction.channel.send(message);
                },
                replyWithAnimation: async message => {
                    return await interaction.channel.send(message);
                },
            };

            if (interaction.customId === "reddit:cute") {
                await this.handleInnerAction(context, "cute.json");
            } else if (interaction.customId === "reddit:tech-memes") {
                await this.handleInnerAction(context, "ProgrammingHumor.json");
            } else if (interaction.customId === "reddit:art") {
                await this.handleInnerAction(context, "art.json");
            } else if (interaction.customId === "reddit:memes") {
                await this.handleInnerAction(context, "memes.json");
            }
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
    async handleInnerAction(ctx, redditGroup) {
        // const loadMsg = await ctx.reply("Processing...");
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

            // await ctx.deleteMessage(loadMsg.message_id);
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
