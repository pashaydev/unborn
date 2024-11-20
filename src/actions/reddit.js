import { saveHistory } from "../database/db.js";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

export default class RedditHandler {
    /**
     * @type {import("@slack/bolt").App} slackBot
     */
    slackBot;
    /**
     * @type {Object} args
     */
    args;
    /**
     * @type {import("telegraf").Telegraf} args.telegramBot
     */
    telegramBot;
    /**
     * @type {Function} args.anthropic
     */
    anthropic;
    /**
     * @type {Function} args.sendMenu
     */
    sendMenu;
    /**
     * @type {Object} args.discordBot
     */
    discordBot;
    constructor(args) {
        this.telegramBot = args.telegramBot;
        this.anthropic = args.anthropic;
        this.sendMenu = args.sendMenu;
        this.discordBot = args.discordBot;

        this.maxAttempts = 5;
        this.redditApiUrl = Deno.env.get("REDDIT_API_URL");
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
        if (context?.command?.command === "/reddit") {
            const blocks = [
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: "Choose a category:",
                    },
                },
                {
                    type: "actions",
                    elements: [
                        {
                            type: "button",
                            text: {
                                type: "plain_text",
                                text: "Cute",
                            },
                            action_id: "reddit:cute",
                        },
                        {
                            type: "button",
                            text: {
                                type: "plain_text",
                                text: "Tech",
                            },
                            action_id: "reddit:tech-memes",
                        },
                    ],
                },
                {
                    type: "actions",
                    elements: [
                        {
                            type: "button",
                            text: {
                                type: "plain_text",
                                text: "Art",
                            },
                            action_id: "reddit:art",
                        },
                        {
                            type: "button",
                            text: {
                                type: "plain_text",
                                text: "mem",
                            },
                            action_id: "reddit:memes",
                        },
                    ],
                },
            ];

            try {
                // Send the message with buttons
                await this.slackBot.client.chat.postMessage({
                    channel: context.body.channel_id,
                    blocks: blocks,
                    text: "Choose a category", // Fallback text
                });
            } catch (error) {
                console.error("Error handling Slack command:", error);
            }
        } else {
            const parseCommand = context.action.action_id.replace("reddit:", "").trim();
            const innerContext = {
                from: {
                    id: context.body.user.id,
                },
                reply: async message => {
                    return await this.slackBot.client.chat.postMessage({
                        channel: context.body.channel.id,
                        text: message,
                    });
                },
                replyWithVideo: async message => {
                    return await this.slackBot.client.chat.postMessage({
                        channel: context.body.channel.id,
                        text: message,
                    });
                },
                replyWithAnimation: async message => {
                    return await this.slackBot.client.chat.postMessage({
                        channel: context.body.channel.id,
                        text: message,
                    });
                },
            };
            if (parseCommand === "cute") {
                await this.handleInnerAction(innerContext, "cute.json");
            } else if (parseCommand === "tech-memes") {
                await this.handleInnerAction(innerContext, "ProgrammingHumor.json");
            } else if (parseCommand === "art") {
                await this.handleInnerAction(innerContext, "art.json");
            } else if (parseCommand === "memes") {
                await this.handleInnerAction(innerContext, "memes.json");
            }
        }
    }

    // Add this as a separate method to handle button clicks
    async handleBlockActions({ body, ack, client }) {
        await ack();
        console.log("Button clicked", body);

        const action = body.actions[0]; // Get the first action from the array
        const buttonContext = {
            from: {
                id: body.user.id,
            },
            reply: async message => {
                return await client.chat.postMessage({
                    channel: body.channel.id,
                    text: message,
                });
            },
            replyWithVideo: async message => {
                return await client.chat.postMessage({
                    channel: body.channel.id,
                    text: message,
                });
            },
            replyWithAnimation: async message => {
                return await client.chat.postMessage({
                    channel: body.channel.id,
                    text: message,
                });
            },
        };

        switch (action.action_id) {
            case "reddit:cute":
                await this.handleInnerAction(buttonContext, "cute.json");
                break;
            case "reddit:tech-memes":
                await this.handleInnerAction(buttonContext, "ProgrammingHumor.json");
                break;
            case "reddit:art":
                await this.handleInnerAction(buttonContext, "art.json");
                break;
            case "reddit:memes":
                await this.handleInnerAction(buttonContext, "memes.json");
                break;
        }
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
                            text: "Tech",
                            callback_data: "reddit:tech-memes",
                        },
                    ],
                    [
                        {
                            text: "Art",
                            callback_data: "reddit:art",
                        },
                        {
                            text: "mem",
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
        const keyboard = [
            new ButtonBuilder()
                .setCustomId("reddit:cute")
                .setLabel("Cute")
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId("reddit:tech-memes")
                .setLabel("Tech")
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId("reddit:art")
                .setLabel("Art")
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId("reddit:memes")
                .setLabel("mem")
                .setStyle(ButtonStyle.Secondary),
        ];

        const row1 = new ActionRowBuilder().addComponents(keyboard[0], keyboard[1]);
        const row2 = new ActionRowBuilder().addComponents(keyboard[2], keyboard[3]);

        const reply = await interaction.editReply({
            components: [row1, row2],
            content: "Choose",
        });

        const collector = reply.createMessageComponentCollector({
            time: 60000, // Optional: collector will stop after 60 seconds
        });

        collector.on("collect", async buttonInteraction => {
            const context = {
                from: {
                    id: buttonInteraction.user.id,
                },
                reply: async message => {
                    return await buttonInteraction.channel.send(message);
                },
                replyWithVideo: async message => {
                    return await buttonInteraction.channel.send(message);
                },
                replyWithAnimation: async message => {
                    return await buttonInteraction.channel.send(message);
                },
            };

            if (buttonInteraction.customId === "reddit:cute") {
                await this.handleInnerAction(context, "cute.json");
            } else if (buttonInteraction.customId === "reddit:tech-memes") {
                await this.handleInnerAction(context, "ProgrammingHumor.json");
            } else if (buttonInteraction.customId === "reddit:art") {
                await this.handleInnerAction(context, "art.json");
            } else if (buttonInteraction.customId === "reddit:memes") {
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
