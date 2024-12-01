import ChessGameHandler from "./chess.js";
import DockAsker from "./dock-asker.js";
import GhostwriterHandler from "./ghostwriter.js";
import RedditHandler from "./reddit.js";
import ImagegenHandler from "./imagegen.js";
import { message } from "telegraf/filters";
import ScrapperHandler from "./scrapper.js";
import { Events, Routes, SlashCommandBuilder } from "discord.js";
import MinecraftServerHandler from "./minecraft.js";
import StoryTellingHandler from "./story.js";

class ActionManager {
    #implementedActions = [
        "dockasker",
        "reddit",
        "chess",
        "imagegen",
        "ghostwriter",
        "ghostwriterfromtexttoaudio",
        "ghostwriteraudio",
        "scrapper",
        "story",
        "minecraft",
    ];

    /**
     * @type {import('telegraf').Telegraf}
     */
    telegramBot;
    /**
     * @type {import('@slack/bolt').App}
     */
    slackBot;
    /**
     * @type {import('discord.js').Client}
     */
    discordBot;
    /**
     * @type {function}
     */
    sendMenu;
    /**
     * @type {import('openai').OpenAi}
     */
    openai;
    /**
     * @type {import('@anthropic-ai/sdk').Anthropic}
     */
    anthropic;
    /**
     * @type {object}
     */
    userManager;

    constructor(args) {
        for (let key in args) {
            this[key] = args[key];
        }

        this.actions = {};
    }

    async registerSlackCommands() {
        for (let action of this.#implementedActions) {
            try {
                const actionInstance = this.createAction(action);
                this.actions[action] = actionInstance;
            } catch (error) {
                console.error("Error creating action instance:", error);
            }
        }

        console.log("Registering Slack commands...");

        for (let action of this.#implementedActions) {
            this.slackBot.command(`/${action}`, async context => {
                const command = context.command.command.replace("/", "");
                console.log("Slack Command:", command);
                const actionInstance = this.getActionInstance(command);

                this.userManager.updateInstance({
                    chatId: context.payload.channel_id,
                    userId: context.context.userId,
                    data: {
                        activeFunction: command,
                        from: "slack",
                        username: context?.payload?.user_name,
                    },
                });

                if (actionInstance && actionInstance.handleSlackCommand) {
                    await context.ack();
                    actionInstance.slackBot = this.slackBot;
                    await actionInstance.handleSlackCommand(context);
                }
            });
        }

        for (const action of ["reddit:cute", "reddit:tech-memes", "reddit:art", "reddit:memes"]) {
            this.slackBot.action(action, async context => {
                const command = context.action.action_id;
                console.log("Slack Action:", command);
                const actionInstance = this.getActionInstance("reddit");

                this.userManager.updateInstance({
                    chatId: context.payload.channel,
                    userId: context.context.userId,
                    data: {
                        activeFunction: "reddit",
                        from: "slack",
                        username: context?.payload?.username,
                    },
                });

                if (actionInstance && actionInstance.handleSlackCommand) {
                    await context.ack();
                    actionInstance.slackBot = this.slackBot;
                    await actionInstance.handleSlackCommand(context);
                }
            });
        }

        const chessHandler = this.getActionInstance("chess");
        // Register action handlers
        this.slackBot.action(/move_.+/, async args => {
            await chessHandler.handleSlackAction(args);
        });

        this.slackBot.action(/page_.+/, async args => {
            await chessHandler.handleSlackAction(args);
        });

        this.slackBot.action("resign", async args => {
            await chessHandler.handleSlackAction(args);
            this.userManager.updateInstance({
                chatId: context.payload.channel,
                userId: context.context.userId,
                data: {
                    activeFunction: null,
                    from: "slack",
                    username: context?.payload?.username,
                },
            });
        });

        this.slackBot.action("dummy_action", async args => {
            await chessHandler.handleSlackAction(args);
        });
    }

    async registerDiscordCommands() {
        for (let action of this.#implementedActions) {
            try {
                const actionInstance = this.createAction(action);
                this.actions[action] = actionInstance;
            } catch (error) {
                console.error("Error creating action instance:", error);
            }
        }

        console.log("Registering Discord commands...");

        const commands = this.#implementedActions.map(action => {
            return new SlashCommandBuilder()
                .setName(action)
                .setDescription("Execute " + action + " command")
                .addStringOption(option =>
                    option.setName("input").setDescription("Input for the command")
                )
                .addAttachmentOption(option =>
                    option.setName("attachment").setDescription("Attachment for the command")
                )
                .toJSON();
        });

        try {
            console.log(
                "Started refreshing application (/) commands for App ID:",
                Bun.env.DISCORD_APP_ID
            );

            await this.discordBot.rest.put(Routes.applicationCommands(Bun.env.DISCORD_APP_ID), {
                body: commands,
            });

            console.log("Successfully reloaded application (/) commands.");

            this.discordBot.on(Events.InteractionCreate, async interaction => {
                if (!interaction.isCommand()) return;

                const { commandName } = interaction;

                console.log("Discord Slash Command:", commandName);

                if (this.#implementedActions.includes(commandName)) {
                    const actionInstance = this.getActionInstance(commandName);

                    try {
                        if (actionInstance && actionInstance.handleDiscordSlashCommand) {
                            await interaction.deferReply();

                            await actionInstance.handleDiscordSlashCommand(
                                interaction,
                                commandName
                            );
                        } else {
                            if (interaction.deferred && !interaction.replied) {
                                await interaction.reply({
                                    content: "This command is not fully implemented yet!",
                                    ephemeral: true,
                                });
                            }
                        }
                    } catch (error) {
                        console.error("Error handling Discord Slash Command:", error);
                    }

                    this.userManager.updateInstance({
                        chatId: interaction.channelId,
                        userId: interaction.user.id,
                        data: {
                            activeFunction: commandName,
                            from: "discord",
                            username: interaction.user.username,
                        },
                    });
                }
            });
        } catch (error) {
            console.error(error);
        }
    }

    async registerTelegramHandlers() {
        // Register Telegram actions and commands
        for (let action of this.#implementedActions) {
            const actionInstance = this.createAction(action);

            // Register Telegram action handlers
            this.telegramBot.action(action, ctx => {
                console.log("Telegram Action:", action);
                actionInstance.initAction(ctx, action);

                this.userManager.updateInstance({
                    chatId: ctx.chat.id,
                    userId: ctx.from.id,
                    data: {
                        activeFunction: action,
                        from: "telegram",
                        username: ctx.from.username,
                    },
                });
            });

            // Register Telegram command handlers
            this.telegramBot.command(action, ctx => {
                console.log("Telegram Command:", action);
                actionInstance.initCommand(ctx, action);

                this.userManager.updateInstance({
                    chatId: ctx.chat.id,
                    userId: ctx.from.id,
                    data: {
                        activeFunction: action,
                        from: "telegram",
                        username: ctx.from.username,
                    },
                });
            });

            this.actions[action] = actionInstance;
        }

        // Register Telegram message handlers
        this.registerTelegramMessageHandlers();
    }

    registerDiscordHandlers() {
        // Update the existing message handler for legacy prefix commands
        this.discordBot.on("messageCreate", async message => {
            if (message.author.bot) return;
            if (!message.content.startsWith("!")) return;

            const args = message.content.slice(1).trim().split(/ +/);
            const command = args.shift().toLowerCase();

            if (this.#implementedActions.includes(command)) {
                console.log("Discord Command:", command);
                const actionInstance = this.getActionInstance(command);

                if (actionInstance && actionInstance.handleDiscordCommand) {
                    actionInstance.handleDiscordCommand(message, args);
                }

                this.userManager.updateInstance({
                    chatId: message.channelId,
                    userId: message.author.id,
                    data: {
                        activeFunction: command,
                        username: message.author.username,
                        from: "discord",
                    },
                });
            }
        });

        // Add slash command handler
        this.discordBot.on("interactionCreate", async interaction => {
            if (!interaction.isCommand()) return;

            const { commandName } = interaction;

            if (this.#implementedActions.includes(commandName)) {
                console.log("Discord Slash Command:", commandName);

                const actionInstance = this.getActionInstance(commandName);

                if (actionInstance && actionInstance.handleDiscordSlashCommand) {
                    await actionInstance.handleDiscordSlashCommand(interaction);
                } else {
                    await interaction.reply({
                        content: "This command is not fully implemented yet!",
                        ephemeral: true,
                    });
                }

                this.userManager.updateInstance({
                    chatId: interaction.channelId,
                    userId: interaction.user.id,
                    data: {
                        activeFunction: command,
                        username: interaction.user.username,
                        from: "discord",
                    },
                });
            }
        });
    }

    registerTelegramMessageHandlers() {
        // Text messages
        this.telegramBot.on(message("text"), async ctx => {
            const userId = ctx.from.id;
            const chatId = ctx.chat.id;

            console.log(
                "Telegram Text message:",
                ctx.message.text,
                "from:",
                userId,
                "chat:",
                chatId
            );
            const user = await this.userManager.getUser(chatId, userId);
            const activeFunction = user?.active_command;

            console.log("Active function:", activeFunction);
            try {
                const command = await this.userManager.getCommand(activeFunction);

                if (activeFunction) {
                    const actionInstance = this.getActionInstance(activeFunction);
                    if (actionInstance && "handleTextMessage" in actionInstance) {
                        actionInstance.handleTextMessage(ctx);
                    }

                    if (command?.once) {
                        console.log("Clean active function from user object");
                        this.userManager.updateInstance({
                            chatId,
                            userId,
                            data: {
                                activeFunction: null,
                                from: "telegram",
                                username: ctx.from.username,
                            },
                        });
                    }
                }
            } catch (err) {
                console.log("Error during handle telegram text message: ", err);
            }
        });

        // Voice messages
        this.telegramBot.on(message("voice"), async ctx => {
            const userId = ctx.from.id;
            const chatId = ctx.chat.id;

            try {
                console.log("Telegram Voice message from:", userId, "chat:", chatId);
                const user = await this.userManager.getUser(chatId, userId);
                const activeFunction = user?.active_command;

                const command = await this.userManager.getCommand(activeFunction);

                if (activeFunction) {
                    const actionInstance = this.getActionInstance(activeFunction);
                    actionInstance?.handleVoiceMessage(ctx);

                    if (command?.once) {
                        this.userManager.updateInstance({
                            chatId,
                            userId,
                            data: {
                                activeFunction: null,
                                from: "telegram",
                                username: ctx.from.username,
                            },
                        });
                    }
                }
            } catch (err) {
                console.log(err);
            }
        });

        // Document messages
        this.telegramBot.on(message("document"), async ctx => {
            const userId = ctx.from.id;
            const chatId = ctx.chat.id;

            console.log("Telegram Document message from:", userId, "chat:", chatId);

            const user = await this.userManager.getUser(chatId, userId);
            const activeFunction = user?.active_command;
            const command = await this.userManager.getCommand(activeFunction);

            if (activeFunction) {
                const actionInstance = this.getActionInstance(activeFunction);
                actionInstance?.handleDocumentMessage(ctx);

                if (command?.once) {
                    this.userManager.updateInstance({
                        chatId,
                        userId,
                        data: {
                            activeFunction: null,
                            from: "telegram",
                            username: ctx.from.username,
                        },
                    });
                }
            }
        });
    }

    getActionInstance(actionName) {
        if (actionName.includes("ghostwriter")) {
            return this.actions["ghostwriter"];
        }
        return this.actions[actionName];
    }

    createAction(actionName) {
        const args = {
            slackBot: this.slackBot,
            telegramBot: this.telegramBot,
            discordBot: this.discordBot,
            anthropic: this.anthropic,
            sendMenu: this.sendMenu,
            openai: this.openai,
            userManager: this.userManager,
        };

        if (actionName === "scrapper") return new ScrapperHandler(args);
        if (actionName === "dockasker") return new DockAsker(args);
        if (actionName === "reddit") return new RedditHandler(args);
        if (actionName === "chess") return new ChessGameHandler(args);
        if (actionName === "imagegen") return new ImagegenHandler(args);
        if (actionName === "minecraft") return new MinecraftServerHandler(args);
        if (actionName === "story") return new StoryTellingHandler(args);

        if (actionName.includes("ghostwriter")) {
            if (!this.actions["ghostwriter"]) {
                this.actions["ghostwriter"] = new GhostwriterHandler(args);
            }
            return this.actions["ghostwriter"];
        }
    }
}

export default ActionManager;
