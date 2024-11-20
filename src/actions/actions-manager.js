import ChessGameHandler from "./chess.js";
import DockAsker from "./dock-asker.js";
import GhostwriterHandler from "./ghostwriter.js";
import RedditHandler from "./reddit.js";
import ImagegenHandler from "./imagegen.js";
import { message } from "telegraf/filters";
import ScrapperHandler from "./scrapper.js";
import { Events, Routes, SlashCommandBuilder } from "discord.js";

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
        for (const key in args) {
            this[key] = args[key];
        }

        this.actions = {};
    }

    registerSlackCommands() {
        for (const action of this.#implementedActions) {
            try {
                const actionInstance = this.createAction(action);
                this.actions[action] = actionInstance;
            } catch (error) {
                console.error("Error creating action instance:", error);
            }
        }

        console.log("Registering Slack commands...");

        for (const action of this.#implementedActions) {
            this.slackBot.command(`/${action}`, async context => {
                const command = context.command.command.replace("/", "");
                console.log("Slack Command:", command);
                const actionInstance = this.getActionInstance(command);

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
        });

        this.slackBot.action("dummy_action", async args => {
            await chessHandler.handleSlackAction(args);
        });

        this.slackBot.message(({ message, say }) => {
            const userId = message.user;
            const chatId = message.channel;

            console.log("Slack Message:", message.text, "from:", userId, "chat:", chatId);
            const user = this.userManager.getUser(chatId, userId);
            const activeFunction = user?.activeFunction;
            const once = user?.once;

            if (activeFunction) {
                const actionInstance = this.getActionInstance(activeFunction);
                if (actionInstance && "handleSlackMessage" in actionInstance) {
                    actionInstance.handleSlackMessage(message, say);
                }

                if (once) {
                    this.userManager.updateInstance({
                        chatId,
                        userId,
                        data: { activeFunction: null },
                        ctx: message,
                    });
                }
            }
        });
    }

    async registerDiscordCommands() {
        for (const action of this.#implementedActions) {
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
                Deno.env.get("DISCORD_APP_ID")
            );

            await this.discordBot.rest.put(
                Routes.applicationCommands(Deno.env.get("DISCORD_APP_ID")),
                {
                    body: commands,
                }
            );

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
                            once: commandName !== "chess",
                        },
                        ctx: { from: { username: interaction.user.username } },
                    });
                }
            });
        } catch (error) {
            console.error(error);
        }
    }

    registerTelegramHandlers() {
        // Register Telegram actions and commands
        for (const action of this.#implementedActions) {
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
                        once: action !== "chess",
                    },
                    ctx,
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
                        once: action !== "chess",
                    },
                    ctx,
                });
            });

            this.actions[action] = actionInstance;
        }

        // Register Telegram message handlers
        this.registerTelegramMessageHandlers();
    }

    registerDiscordHandlers() {
        // Update the existing message handler for legacy prefix commands
        this.discordBot.on("messageCreate", message => {
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
                        once: command !== "chess",
                    },
                    ctx: message,
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
                        activeFunction: commandName,
                        once: commandName !== "chess",
                    },
                    ctx: interaction,
                });
            }
        });
    }

    registerTelegramMessageHandlers() {
        // Text messages
        this.telegramBot.on(message("text"), ctx => {
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
            const user = this.userManager.getUser(chatId, userId);
            const activeFunction = user?.activeFunction;
            const once = user?.once;

            if (activeFunction) {
                const actionInstance = this.getActionInstance(activeFunction);
                if (actionInstance && "handleTextMessage" in actionInstance) {
                    actionInstance.handleTextMessage(ctx);
                }

                if (once) {
                    this.userManager.updateInstance({
                        chatId,
                        userId,
                        data: { activeFunction: null },
                        ctx,
                    });
                }
            }
        });

        // Voice messages
        this.telegramBot.on(message("voice"), ctx => {
            const userId = ctx.from.id;
            const chatId = ctx.chat.id;

            console.log("Telegram Voice message from:", userId, "chat:", chatId);
            const user = this.userManager.getUser(chatId, userId);
            const activeFunction = user?.activeFunction;
            const once = user?.once;

            if (activeFunction) {
                const actionInstance = this.getActionInstance(activeFunction);
                actionInstance?.handleVoiceMessage(ctx);

                if (once) {
                    this.userManager.updateInstance({
                        chatId,
                        userId,
                        data: { activeFunction: null },
                        ctx,
                    });
                }
            }
        });

        // Document messages
        this.telegramBot.on(message("document"), ctx => {
            const userId = ctx.from.id;
            const chatId = ctx.chat.id;

            console.log("Telegram Document message from:", userId, "chat:", chatId);
            const user = this.userManager.getUser(chatId, userId);
            const activeFunction = user?.activeFunction;
            const once = user?.once;

            if (activeFunction) {
                const actionInstance = this.getActionInstance(activeFunction);
                actionInstance?.handleDocumentMessage(ctx);

                if (once) {
                    this.userManager.updateInstance({
                        chatId,
                        userId,
                        data: { activeFunction: null },
                        ctx,
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
        if (actionName.includes("ghostwriter")) {
            if (!this.actions["ghostwriter"]) {
                this.actions["ghostwriter"] = new GhostwriterHandler(args);
            }
            return this.actions["ghostwriter"];
        }
    }
}

export default ActionManager;
