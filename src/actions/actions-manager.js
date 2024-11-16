import ChessGameHandler from "./chess.js";
import DockAsker from "./dock-asker.js";
import GhostwriterHandler from "./ghostwriter.js";
import RedditHandler from "./reddit.js";
import ImagegenHandler from "./imagegen.js";
import { message } from "telegraf/filters";
import ScrapperHandler from "./scrapper.js";

class ActionManager {
    /**
     * @param {import('telegraf').Telegraf} bot
     * @param {function} sendMenu
     * @param {import OpenAi from "openai";} openai
     * @param {import Anthropic from "@anthropic-ai/sdk";} anthropic
     * @param {object} userManager
     */
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
    constructor(args) {
        for (let key in args) {
            this[key] = args[key];
        }

        this.actions = {};

        for (let action of this.#implementedActions) {
            const actionInstance = this.createAction(action);
            this.bot.action(action, ctx => {
                console.log("Action:", action);
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

            this.bot.command(action, ctx => {
                console.log("Command:", action);
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

        this.bot.on(message("text"), async ctx => {
            const userId = ctx.from.id;
            const chatId = ctx.chat.id;

            console.log("Text message:", ctx.message.text, "from:", userId, "chat:", chatId);
            const chat = this.userManager.getChat(chatId);
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
                        data: {
                            activeFunction: null,
                        },
                        ctx,
                    });
                }
            }
        });

        this.bot.on(message("voice"), async ctx => {
            const userId = ctx.from.id;
            const chatId = ctx.chat.id;

            console.log("Voice message:", ctx.message.audio, "from:", userId, "chat:", chatId);

            const chat = this.userManager.getChat(chatId);
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
                        data: {
                            activeFunction: null,
                        },
                        ctx,
                    });
                }
            }
        });

        this.bot.on(message("document"), async ctx => {
            const userId = ctx.from.id;
            const chatId = ctx.chat.id;

            console.log(
                "Document message:",
                ctx.message.document,
                "from:",
                userId,
                "chat:",
                chatId
            );

            const chat = this.userManager.getChat(chatId);
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
                        data: {
                            activeFunction: null,
                        },
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

    /**
     * @param {string} actionName
     * @returns {object | null}
     * */
    createAction(actionName) {
        const args = {
            bot: this.bot,
            anthropic: this.anthropic,
            sendMenu: this.sendMenu,
            openai: this.openai,
            userManager: this.userManager,
        };
        if (actionName === "scrapper") {
            return new ScrapperHandler(args);
        }
        if (actionName === "dockasker") {
            return new DockAsker(args);
        }
        if (actionName === "reddit") {
            return new RedditHandler(args);
        }
        if (actionName === "chess") {
            return new ChessGameHandler(args);
        }
        if (actionName === "imagegen") {
            return new ImagegenHandler(args);
        }

        if (actionName.includes("ghostwriter")) {
            if (!this.actions["ghostwriter"]) {
                this.actions["ghostwriter"] = new GhostwriterHandler(args);
            }

            return this.actions["ghostwriter"];
        }
    }
}

export default ActionManager;
