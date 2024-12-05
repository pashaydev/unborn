import { Markup } from "telegraf";
import { saveHistory, updateTokensTracking } from "../database/db.js";

export default class StoryTellingHandler {
    /**
     * @type {import('telegraf').Telegraf} telegramBot - Telegraf instance
     */
    telegramBot;
    /**
     * @type {import("@anthropic-ai/sdk").Anthropic} anthropic - Anthropic instance
     */
    anthropic;
    /**
     * @typedef {Object} Chat
     * @property {Array.<{role: string, content: string}>} history - The history of messages exchanged in the chat.
     * @property {string} textMessage - The current text message in the chat.
     * @property {string} genre - The genre of the story being created in the chat.
     * @property {boolean} isContextMessage
     * @property {Array.<{string}>} choices
     * @property {string>} userContextForStory
     *
     */

    /**
     * @type {Object.<string, Chat>}
     */
    chats = {};

    constructor(args) {
        for (const key in args) {
            this[key] = args[key];
        }
        this.messageHash = {};
        this.chats = {};
        this.initializeTelegramActions();
    }

    initializeTelegramActions() {
        if (!this.telegramBot) return;

        this.telegramBot.action(/genre_(.+)/, this.handleGenreSelection.bind(this));
        this.telegramBot.action(/choice_(.+)/, this.handleChoiceSelection.bind(this));
    }

    async logAndSaveHistory(ctx, action, userInput, botResponse) {
        console.log(`[${action}] User: ${ctx?.from?.username}, Input: ${userInput}`);
        await saveHistory({
            userId: ctx.from.id,
            userInput,
            botResponse,
        });
    }

    async handleGenreSelection(ctx) {
        try {
            const genre = ctx.match[1];
            const chat = this.getCurrentChat(ctx.from.id);
            if (!chat) {
                return await ctx.reply("Please start a new story with /story");
            }

            if (!chat) {
                return await ctx.reply(
                    "User: " + ctx.from.first_name + ". Send [ /story ] command for start."
                );
            }

            await this.logAndSaveHistory(ctx, "GENRE_SELECTION", genre, `Genre selected: ${genre}`);

            chat.genre = genre;
            chat.isContextMessage = true;
            this.initializeSystemPrompt(chat);

            await ctx.reply(
                "Provide a little context for the story, main characters, and place where it all will happens."
            );
        } catch (error) {
            console.error("[GENRE_SELECTION_ERROR]", error);
            await ctx.reply("An error occurred while selecting the genre. Please try again.");
        }
    }

    initializeSystemPrompt(chat) {
        if (chat) {
            chat.history.push({
                role: "assistant",
                content: `
                You are an AI storyteller tasked with creating fun and engaging fanfiction-style stories based on user choices. Your goal is to craft an interactive narrative experience that adapts to user input while maintaining coherence and entertainment value.

                You will receive the current story context in the following format:

                <story_context>
                {{STORY_CONTEXT}}
                </story_context>

                Use this information to inform your storytelling and ensure continuity. The context includes details about the current state of the story, characters, setting, and any relevant plot points.

                Guidelines for storytelling:
                1. Keep the narrative engaging, descriptive, and appropriate for a general audience.
                2. Maintain consistency with established characters, settings, and plot elements.
                3. Incorporate elements of humor, suspense, or drama as appropriate for the story's genre.
                4. Limit each story segment to 1-2 paragraphs to keep the pacing dynamic.
                5. End each segment with a choice for the user to make, presenting 2-4 options.

                When you receive a user choice, incorporate it into the story naturally. The user's choice will be provided in this format:

                <user_choice>
                {{USER_CHOICE}}
                </user_choice>

                Based on the user's choice, continue the story in a logical and entertaining manner. Be creative in how you interpret and implement the user's decision, but ensure it aligns with the overall narrative.

                Your response should be structured as follows:
                1. A 1-2 paragraph continuation of the story based on the user's choice and current context.
                2. A set of 2-4 new choices for the user to select from, each briefly described in one sentence.

                Format your response like this:

                [Your 1-2 paragraph story continuation here]


                <choices>
                1. [First choice description]
                2. [Second choice description]
                3. [Third choice description (if applicable)]
                4. [Fourth choice description (if applicable)]
                </choices>

                Here's an example of how an interaction might look:

                <example>
                <story_context>
                Harry, Ron, and Hermione are sneaking through the corridors of Hogwarts at night. They've just heard a strange noise coming from the forbidden third-floor corridor.
                </story_context>

                <user_choice>
                Investigate the noise
                </user_choice>


                Heart pounding, Harry led his friends towards the source of the mysterious sound. As they crept closer to the forbidden corridor, the noise grew louder – a low, rumbling growl that sent shivers down their spines. Ron's face paled in the dim wandlight, but Hermione's eyes sparkled with a mix of fear and curiosity.

                Rounding the corner, they froze in their tracks. Before them stood an enormous, three-headed dog, its massive paws planted firmly on a trapdoor. The beast's eyes locked onto the trio, and all three heads let out a thunderous bark that shook the very stones of the castle.

                <choices>
                1. Attempt to distract the dog and slip past it to the trapdoor.
                2. Quickly retreat and try to find information about the three-headed dog in the library.
                3. Use a spell to try and calm the dog down.
                </choices>
                </example>

                To ensure the story has a proper conclusion, you need to keep track of the number of story segments. The current segment count will be provided to you in this format:

                <segment_count>
                {{SEGMENT_COUNT}}
                </segment_count>

                When the segment count reaches 10-12, start wrapping up the story. In the 15th to 20th segment, instead of providing choices, end the story with a satisfying conclusion. Format the final segment like this:

                <story_conclusion>
                [Your 2-3 paragraph story conclusion here]
                </story_conclusion>

                Remember to always maintain the story's continuity, build upon previous events, and create an immersive experience for the user. Good luck, storyteller!
            `,
            });
        }
    }

    async handleChoiceSelection(ctx) {
        const chat = this.chats[ctx.from.id];
        if (!chat) return;

        const choiceIndex = Number(ctx.match[1]);
        const selectedChoice = chat.choices?.[choiceIndex];

        if (!selectedChoice) {
            console.error("[CHOICE_SELECTION_ERROR] Invalid choice index:", choiceIndex);
            return;
        }

        const loadingMessage = await ctx.reply("Loading...");
        try {
            await this.logAndSaveHistory(
                ctx,
                "CHOICE_SELECTION",
                selectedChoice,
                "Choice processed"
            );

            const lastMessageBefore = chat.history.at(-1);

            await this.processChoice(ctx, chat, selectedChoice);

            await this.continueStory(ctx, chat, selectedChoice);
        } catch (error) {
            console.error("[CHOICE_SELECTION_ERROR]", error);
            await ctx.reply("An error occurred while processing your choice. Please try again.");
        }

        try {
            await ctx.telegram.deleteMessage(ctx.chat.id, loadingMessage.message_id);
        } catch (err) {
            console.log(err);
        }
    }

    async processChoice(ctx, chat, choice) {
        chat.choices = [];
        if (chat.choicesMessageId) {
            await ctx.reply(choice);

            try {
                await this.telegramBot.telegram.deleteMessage(ctx.chat.id, chat.choicesMessageId);
            } catch (err) {
                console.log(err);
            }
            chat.choicesMessageId = null;
        }
    }

    async generateAndSendImage(ctx, text, contextMessage) {
        try {
            const rephrasedRes = await this.anthropic.messages.create({
                model: "claude-3-5-haiku-latest",
                max_tokens: 2000,
                system: "You are will formatting part of the history into image generation prompt. That's only one purpose for you. Do not respond anything except prepared text to Image generation.",
                messages: [
                    {
                        role: "assistant",
                        content:
                            "Try to avoid photorealistic styles for image generation, provide more mood based parameters",
                    },
                    {
                        role: "user",
                        content:
                            "It's my next choice for my interactive story where i can choose where story should move, prepare image based on this choice: " +
                            text +
                            " Context for story from user: " +
                            contextMessage,
                    },
                ],
            });

            updateTokensTracking(ctx, rephrasedRes, "story");

            await this.logAndSaveHistory(
                ctx,
                "GENERATING IMAGE PROMPT",
                "image prompt",
                rephrasedRes.content[0].text
            );

            const response = await this.callStabilityAPI(rephrasedRes.content[0].text);

            // if (response.status === 200) {
            //     const imageBuffer = Buffer.from(response.data);

            //     await ctx.replyWithPhoto({ source: imageBuffer });
            //     await this.logAndSaveHistory(
            //         ctx,
            //         "IMAGE_GENERATION",
            //         text,
            //         "Image generated successfully"
            //     );
            // } else {
            //     throw new Error(`${response.status}: ${response.data.toString()}`);
            // }

            if (response.ok) {
                const responseData = await response.json();
                const imageBuffer = Buffer.from(responseData.artifacts[0].base64, "base64");
                await ctx.replyWithPhoto({ source: imageBuffer });
                await this.logAndSaveHistory(
                    ctx,
                    "IMAGE_GENERATION",
                    text,
                    "Image generated successfully"
                );
            } else {
                throw new Error("Failed to generate image");
            }
        } catch (error) {
            console.error("[IMAGE_GENERATION_ERROR]", error);
        }
    }

    async continueStory(ctx, chat, choice) {
        try {
            const inputMessage = { role: "user", content: `Choice: ${choice}` };
            const storyPart = await this.generatePartOfStory({
                history: chat.history,
                inputMessage,
                ctx,
            });

            const choices = parseChoices(storyPart);
            chat.choices = choices;

            // const context = chat.history.map(c => c.content);

            this.generateAndSendImage(ctx, inputMessage.content, chat.userContextForStory || "");

            chat.history.push(inputMessage, { role: "assistant", content: storyPart });

            const parsedStory = storyPart.replace(
                /<choices>[\s\S]*<\/choices>/,
                choices.map((c, i) => `${i + 1}. ${c}`).join("\n")
            );

            if (parsedStory.length > 5) await ctx.reply(parsedStory);
            const choicesMessage = await this.sendChoices(ctx, choices);
            chat.choicesMessageId = choicesMessage.message_id;

            await this.logAndSaveHistory(ctx, "STORY_CONTINUATION", choice, storyPart);
        } catch (error) {
            console.error("[STORY_CONTINUATION_ERROR]", error);
            await ctx.reply("Story ended unexpectedly. Please start a new one.");
        }
    }

    async callStabilityAPI(text) {
        const payload = {
            text_prompts: [{ text }],
            samples: 2,
            steps: 40,
        };

        return fetch(
            "https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    Authorization: `Bearer ${process.env.STABLE_DIFFUSION_API_KEY}`,
                },
                body: JSON.stringify(payload),
            }
        );
    }

    async sendChoices(ctx, choices) {
        return await ctx.reply("Make choice", {
            reply_markup: {
                inline_keyboard: choices
                    .map((_, index) => [
                        Markup.button.callback(`Option: ${index + 1}`, `choice_${index}`),
                    ])
                    .reduce((rows, button, index) => {
                        if (index % 3 === 0) rows.push([]);
                        rows[rows.length - 1].push(button[0]);
                        return rows;
                    }, []),
            },
        });
    }

    /**
     * Handles incoming story context messages and continues the story flow
     * @param {import("telegraf").Context} ctx - The Telegram context
     * @returns {Promise<void>}
     */
    async handleTextMessage(ctx) {
        const textMessage = ctx.message.text;
        const userId = ctx.from.id;
        const chat = this.getCurrentChat(userId);

        if (!chat) {
            return await this.handleNoActiveChat(ctx);
        }

        const loadingMessage = await ctx.reply("Loading...");

        try {
            chat.userContextForStory = textMessage;

            if (chat.isContextMessage) {
                await this.processStoryContext(ctx, chat, textMessage);
            } else {
                await this.handleUnexpectedMessage(ctx);
            }

            await this.logAndSaveHistory(
                ctx,
                "STORY_CONTEXT",
                textMessage,
                "Story context processed"
            );
        } catch (error) {
            console.error("[HANDLE_STORY_CONTEXT_ERROR]", error);
            await ctx.reply("An error occurred while processing your message. Please try again.");
        }

        try {
            ctx.telegram.deleteMessage(ctx.chat.id, loadingMessage.message_id);
        } catch (err) {
            console.log(err);
        }
    }

    /**
     * Processes the story context and generates the initial story part
     * @private
     * @param {import("telegraf").Context} ctx
     * @param {Chat} chat
     * @param {string} textMessage
     */
    async processStoryContext(ctx, chat, textMessage) {
        chat.isContextMessage = false;

        // Add context to history
        chat.history.push({
            role: "user",
            content: "Context for story: " + textMessage,
        });

        const inputMessage = {
            role: "user",
            content: `Let's create new story for me with genre: ${chat.genre}`,
        };

        // Generate initial story part
        const storyPart = await this.generatePartOfStory({
            history: chat.history,
            inputMessage: inputMessage,
            ctx,
        });

        const choices = parseChoices(storyPart);
        const parsedStory = storyPart.replace(
            /<choices>[\s\S]*<\/choices>/,
            choices.map((c, i) => `${i + 1}. ${c}`).join("\n")
        );

        // Update chat history
        chat.history.push(inputMessage, {
            role: "assistant",
            content: storyPart,
        });

        if (parsedStory.length > 5)
            // Send story part to user
            await ctx.reply(parsedStory);

        // Handle choices
        await this.processAndSendChoices(ctx, chat, storyPart);
    }

    /**
     * Processes and sends choices to the user
     * @private
     * @param {import("telegraf").Context} ctx
     * @param {Chat} chat
     * @param {string} storyPart
     */
    async processAndSendChoices(ctx, chat, storyPart) {
        const choices = parseChoices(storyPart);
        chat.choices = choices;

        const choicesMessage = await this.sendChoices(ctx, choices);
        chat.choicesMessageId = choicesMessage.message_id;
    }

    /**
     * Handles the case when there is no active chat
     * @private
     * @param {import("telegraf").Context} ctx
     */
    async handleNoActiveChat(ctx) {}

    /**
     * Handles unexpected messages during story flow
     * @private
     * @param {import("telegraf").Context} ctx
     */
    async handleUnexpectedMessage(ctx) {
        await ctx.reply(
            "I wasn't expecting a message at this point. Please use the provided choices to continue the story."
        );
    }
    initAction(ctx) {}

    async handleDiscordSlashCommand(interaction) {
        try {
        } catch (error) {
            console.error("Discord command error:", error);
        }
    }

    async generatePartOfStory({ inputMessage, history = [], ctx = {}, userContextForStory }) {
        try {
            const response = await this.anthropic.messages.create({
                max_tokens: 8190,
                model: "claude-3-5-haiku-latest",
                system: "You are a creative and engaging storyteller. Your task is to generate the next part of an interactive and fun story based on the user's input. Make sure to keep the story coherent, imaginative, and entertaining. Respond in a way that encourages the user to continue the story with their own ideas.",
                messages: [...history, inputMessage],
            });

            updateTokensTracking(ctx, response, "story");

            return response.content[0].text;
        } catch (err) {
            console.error(err);
        }
    }

    /**
     * Initializes or resets a chat session for a user
     * @param {string|number} userId - The unique identifier for the user
     * @returns {Chat|null} The initialized chat object or null if initialization fails
     */
    initializeChat(userId) {
        try {
            if (!userId) {
                console.error("[CHAT_INIT_ERROR] No userId provided");
                return null;
            }

            this.chats[userId] = {
                textMessage: "",
                history: [],
                genre: "",
                initialMessageId: null,
                choices: [],
                isContextMessage: false,
                choicesMessageId: null,
                lastActivity: new Date(),
                state: "INITIALIZED",
            };

            return this.chats[userId];
        } catch (error) {
            console.error("[CHAT_INIT_ERROR]", error);
            return null;
        }
    }

    /**
     * Validates if a chat session exists and is active
     * @param {string|number} userId - The unique identifier for the user
     * @returns {boolean} Whether the chat is valid and active
     */
    isValidChat(userId) {
        const chat = this.chats[userId];
        if (!chat) return false;

        const inactivityLimit = 30 * 60 * 1000; // 30 minutes
        const isExpired = new Date() - chat.lastActivity > inactivityLimit;

        if (isExpired) {
            this.cleanupChat(userId);
            return false;
        }

        return true;
    }

    /**
     * Updates the last activity timestamp for a chat
     * @param {string|number} userId - The unique identifier for the user
     */
    updateChatActivity(userId) {
        if (this.chats[userId]) {
            this.chats[userId].lastActivity = new Date();
        }
    }

    /**
     * Cleans up an expired or ended chat session
     * @param {string|number} userId - The unique identifier for the user
     */
    cleanupChat(userId) {
        try {
            if (this.chats[userId]) {
                // Save final chat state if needed
                this.saveHistory({
                    userId,
                    action: "CHAT_CLEANUP",
                    state: this.chats[userId].state,
                    timestamp: new Date().toISOString(),
                });

                delete this.chats[userId];
            }
        } catch (error) {
            console.error("[CHAT_CLEANUP_ERROR]", error);
        }
    }

    /**
     * Gets the current state of a chat session
     * @param {string|number} userId - The unique identifier for the user
     * @returns {Chat|null} The current chat object or null if not found
     */
    getCurrentChat(userId) {
        if (!this.isValidChat(userId)) {
            return null;
        }

        this.updateChatActivity(userId);
        return this.chats[userId];
    }

    /**
     * Updates the state of a chat session
     * @param {string|number} userId - The unique identifier for the user
     * @param {Partial<Chat>} updates - The updates to apply to the chat
     * @returns {boolean} Whether the update was successful
     */
    updateChat(userId, updates) {
        try {
            const chat = this.getCurrentChat(userId);
            if (!chat) return false;

            this.chats[userId] = {
                ...chat,
                ...updates,
                lastActivity: new Date(),
            };

            return true;
        } catch (error) {
            console.error("[CHAT_UPDATE_ERROR]", error);
            return false;
        }
    }

    /**
     * Handles chat initialization for commands
     * @param {import("telegraf").Context} ctx - The Telegram context
     */
    async initCommand(ctx) {
        try {
            const message = await ctx.reply("What kind of story would you like to hear?", {
                reply_markup: {
                    inline_keyboard: [
                        [
                            Markup.button.callback("🧙 Fantasy", "genre_fantasy"),
                            Markup.button.callback("🚀 Sci-Fi", "genre_scifi"),
                        ],
                        [
                            Markup.button.callback("🕵️‍♂️ Mystery", "genre_mystery"),
                            Markup.button.callback("🏞️ Adventure", "genre_adventure"),
                        ],
                        [
                            Markup.button.callback("❤️ Romance", "genre_romance"),
                            Markup.button.callback("👻 Horror", "genre_horror"),
                        ],
                        [
                            Markup.button.callback("🤡 Comedy", "genre_comedy"),
                            Markup.button.callback("🕵️ Detective", "genre_detective"),
                        ],
                    ],
                },
            });

            const chat = this.initializeChat(ctx.from.id);
            if (chat) {
                chat.initialMessageId = message.message_id;
                await this.logAndSaveHistory(
                    ctx,
                    "CHAT_INITIALIZATION",
                    "/story",
                    "Story session initialized"
                );
            }
        } catch (error) {
            console.error("[COMMAND_INIT_ERROR]", error);
            await ctx.reply("❌ An error occurred while starting the story. Please try again.");
        }
    }

    convertToSlackButton(parent) {
        const buttons = (
            parent?.reply_markup?.inline_keyboard ||
            parent?.inline_keyboard ||
            []
        ).flat();

        if (!buttons.length) return [];

        try {
            const blocks = [
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: "Choose your move:",
                    },
                },
            ];

            // Group buttons into sections of 5 (Slack's limit)
            for (let i = 0; i < buttons.length; i += 5) {
                const buttonGroup = buttons.slice(i, i + 5);
                blocks.push({
                    type: "actions",
                    elements: buttonGroup.map(button => ({
                        type: "button",
                        text: {
                            type: "plain_text",
                            text: button.text,
                        },
                        value: button.callback_data,
                        action_id: button.callback_data,
                    })),
                });
            }

            return blocks;
        } catch (error) {
            console.error("Error converting keyboard:", error);
            return [];
        }
    }

    async handleSlackAction(args) {
        try {
            const { action, body, ack, respond } = args;

            console.log("Slack action: ", args);

            // Create a context object that matches the format used in other platforms
            // const context = {
            //     chat: { id: body.channel.id },
            //     from: { id: body.user.id },
            //     reply: async (message, keyboard) => {
            //         try {
            //             const convertedButtons = this.convertToSlackButton(keyboard || []);
            //             await respond({
            //                 text: message,
            //                 blocks: convertedButtons,
            //                 replace_original: false,
            //             });
            //         } catch (error) {
            //             console.error("Error sending reply:", error);
            //         }
            //     },
            // };

            // const payload = context.payload;
            // const client = context.client;
            // const actionId = payload.action_id;
            // const userId = payload.user.id;
            // const channelId = payload.channel.id;

            // if (actionId.startsWith("genre_")) {
            //     await this.handleSlackGenreSelection(payload, client);
            // } else if (actionId.startsWith("choice_")) {
            //     await this.handleSlackChoiceSelection(payload, client);
            // }

            if (action.action_id.startsWith("genre_")) {
                await this.handleSlackGenreSelection(args);
            } else if (action.action_id.startsWith("choice_")) {
                await this.handleSlackChoiceSelection(args);
            }
        } catch (error) {
            console.error("[SLACK_ACTION_ERROR]", error);
            await this.slackBot.client.chat.postMessage({
                channel: payload.channel.id,
                text: "An error occurred while processing your action. Please try again.",
            });
        }
    }

    async handleSlackGenreSelection(context) {
        const genre = context.action.action_id.replace("genre_", "");

        const chat = this.getCurrentChat(context.context.userId);

        if (!chat) {
            await this.slackBot.client.chat.postMessage({
                channel: context.body.channel.id,
                text: "Please start a new story with /story command",
            });
            return;
        }

        chat.genre = genre;
        chat.isContextMessage = true;
        this.initializeSystemPrompt(chat);

        await this.slackBot.client.chat.postMessage({
            channel: context.body.channel.id,
            text: "Provide a little context for the story, main characters, and place where it all will happens.",
        });
    }

    async handleSlackChoiceSelection(context) {
        const chat = this.getCurrentChat(context.content.userId);
        if (!chat) return;

        const choiceIndex = Number(context.action.action_id.replace("choice_", ""));
        const selectedChoice = chat.choices?.[choiceIndex];

        if (!selectedChoice) {
            console.error("[SLACK_CHOICE_SELECTION_ERROR] Invalid choice index:", choiceIndex);
            return;
        }

        await this.slackBot.client.chat.postMessage({
            channel: context.body.channel.id,
            text: "Loading...",
        });

        try {
            await this.processSlackChoice(context, this.slackBot.client, chat, selectedChoice);
            await this.continueSlackStory(context, this.slackBot.client, chat, selectedChoice);
        } catch (error) {
            console.error("[SLACK_CHOICE_SELECTION_ERROR]", error);
            await this.slackBot.client.chat.postMessage({
                channel: context.body.channel.id,
                text: "An error occurred while processing your choice. Please try again.",
            });
        }
    }

    async processSlackChoice(payload, client, chat, choice) {
        chat.choices = [];
        await this.slackBot.client.chat.postMessage({
            channel: payload.channel.id,
            text: choice,
        });
    }

    async continueSlackStory(mainContext, client, chat, choice) {
        try {
            const inputMessage = { role: "user", content: `Choice: ${choice}` };
            const storyPart = await this.generatePartOfStory({
                history: chat.history,
                inputMessage,
                contextMessage: chat.userContextForStory,
            });

            const choices = parseChoices(storyPart);
            chat.choices = choices;

            const context = chat.history.map(c => c.content);
            this.generateAndSendSlackImage(
                mainContext,
                this.slackBot.client,
                inputMessage.content,
                context
            );

            chat.history.push(inputMessage, { role: "assistant", content: storyPart });

            const parsedStory = storyPart.replace(
                /<choices>[\s\S]*<\/choices>/,
                choices.map((c, i) => `${i + 1}. ${c}`).join("\n")
            );

            if (parsedStory.length > 5) {
                await this.slackBot.client.chat.postMessage({
                    channel: payload.channel.id,
                    text: parsedStory,
                });
            }

            await this.sendSlackChoices(payload, this.slackBot.client, choices);
        } catch (error) {
            console.error("[SLACK_STORY_CONTINUATION_ERROR]", error);
            await this.slackBot.client.chat.postMessage({
                channel: payload.channel.id,
                text: "Story ended unexpectedly. Please start a new one.",
            });
        }
    }

    async sendSlackChoices(payload, client, choices) {
        const blocks = [
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: "Make your choice:",
                },
            },
            {
                type: "actions",
                elements: choices.map((choice, index) => ({
                    type: "button",
                    text: {
                        type: "plain_text",
                        text: `Option ${index + 1}`,
                        emoji: true,
                    },
                    value: `${index}`,
                    action_id: `choice_${index}`,
                })),
            },
        ];

        await this.slackBot.client.chat.postMessage({
            channel: payload.channel.id,
            blocks: blocks,
        });
    }

    async generateAndSendSlackImage(mainContext, client, text, contextMessage) {
        try {
            const rephrasedRes = await this.anthropic.messages.create({
                model: "claude-3-5-haiku-latest",
                max_tokens: 2000,
                system: "You are will formatting part of the history into image generation prompt. That's only one purpose for you. Do not respond anything except prepared text to Image generation.",
                messages: [
                    {
                        role: "user",
                        content:
                            "Rephrase and prepare for image generation this next part of my story Choice: " +
                            text +
                            " History: " +
                            contextMessage,
                    },
                ],
            });

            const response = await this.callStabilityAPI(rephrasedRes.content[0].text);

            if (response.ok) {
                const responseData = await response.json();
                const imageBase64 = responseData.artifacts[0].base64;

                // Upload image to Slack
                const result = await this.slackBot.client.files.upload({
                    channels: maincontext.body.channel.id,
                    file: Buffer.from(imageBase64, "base64"),
                    filename: "story-image.png",
                    title: "Story Illustration",
                });
            } else {
                throw new Error("Failed to generate image");
            }
        } catch (error) {
            console.error("[SLACK_IMAGE_GENERATION_ERROR]", error);
        }
    }

    /**
     * @param {import('@slack/bolt').SlackCommandMiddlewareArgs} context - Slack
     */
    async handleSlackCommand(context) {
        try {
            const body = context.body;
            console.log("Handling slack command:", body);

            const text = body.text;
            const userId = body.user_id;

            // Send message with block buttons
            const response = await this.slackBot.client.chat.postMessage({
                channel: body.channel_id,
                text: "What kind of story would you like to hear?",
                blocks: [
                    {
                        type: "section",
                        text: {
                            type: "mrkdwn",
                            text: "What kind of story would you like to hear?",
                        },
                    },
                    {
                        type: "actions",
                        elements: [
                            {
                                type: "button",
                                text: {
                                    type: "plain_text",
                                    text: "🧙‍♂️ Fantasy",
                                },
                                value: "genre_fantasy",
                                action_id: "genre_fantasy",
                            },
                            {
                                type: "button",
                                text: {
                                    type: "plain_text",
                                    text: "🚀 Sci-Fi",
                                },
                                value: "genre_scifi",
                                action_id: "genre_scifi",
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
                                    text: "🕵️‍♂️ Mystery",
                                },
                                value: "genre_mystery",
                                action_id: "genre_mystery",
                            },
                            {
                                type: "button",
                                text: {
                                    type: "plain_text",
                                    text: "🏞️ Adventure",
                                },
                                value: "genre_adventure",
                                action_id: "genre_adventure",
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
                                    text: "❤️ Romance",
                                },
                                value: "genre_romance",
                                action_id: "genre_romance",
                            },
                            {
                                type: "button",
                                text: {
                                    type: "plain_text",
                                    text: "👻 Horror",
                                },
                                value: "genre_horror",
                                action_id: "genre_horror",
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
                                    text: "🤡 Comedy",
                                    emoji: true,
                                },
                                value: "genre_comedy",
                                action_id: "genre_comedy",
                            },
                            {
                                type: "button",
                                text: {
                                    type: "plain_text",
                                    text: "🕵️ Detective",
                                    emoji: true,
                                },
                                value: "genre_detective",
                                action_id: "genre_detective",
                            },
                        ],
                    },
                ],
            });

            // Initialize chat
            const chat = this.initializeChat(userId);

            if (chat) {
                chat.initialMessageId = response.ts;

                await this.logAndSaveHistory(
                    {
                        from: {
                            id: context.body.user_id,
                            username: context.body.user_name,
                        },
                    },
                    "CHAT_INITIALIZATION",
                    "/story",
                    "Story session initialized"
                );
            }
        } catch (err) {
            console.error("[Error processing slack command]: ", err);
            await context.client.chat.postMessage({
                channel: body.channel_id,
                text: "❌ An error occurred while starting the story. Please try again.",
            });
        }
    }
}

function parseChoices(text) {
    // Find the content between <choices> tags
    const choicesMatch = text.match(/<choices>([\s\S]*?)<\/choices>/);

    if (!choicesMatch) {
        return [];
    }

    // Split the content by newlines and filter out empty lines
    const choices = choicesMatch[1]
        .split("\n")
        .map(line => {
            // Remove numbers and dots from the beginning and trim whitespace
            return line.replace(/^\d+\.\s*/, "").trim();
        })
        .filter(line => line.length > 0);

    return choices;
}
