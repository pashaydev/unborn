import { Markup } from "telegraf";
import { saveHistory } from "../database/db.js";

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
        console.log(`[${action}] User: ${ctx.from.username}, Input: ${userInput}`);
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
            You are an AI storyteller create fun and engaging fanfiction-style stories based on user choices. Your task is to craft an interactive narrative experience that adapts to user input while maintaining coherence and entertainment value.

            First, you will receive the current story context.

            This context includes information about the current state of the story, characters, setting, and any relevant plot points. Use this information to inform your storytelling and ensure continuity.

            Guidelines for storytelling:
            1. Keep the narrative engaging, descriptive, and appropriate for a general audience.
            2. Maintain consistency with established characters, settings, and plot elements.
            3. Incorporate elements of humor, suspense, or drama as appropriate for the story's genre.
            4. Limit each story segment to 1-2 paragraphs to keep the pacing dynamic.
            5. End each segment with a choice for the user to make, presenting 2-4 options.

            When you receive a user choice, incorporate it into the story naturally.

            Based on the user's choice, continue the story in a logical and entertaining manner. Be creative in how you interpret and implement the user's decision, but ensure it aligns with the overall narrative.

            Your response should be structured as follows:
            1. A 1-2 paragraph continuation of the story based on the user's choice and current context.
            2. A set of 2-3 new choices for the user to select from, each briefly described in one sentence.

            Format your response like this:
            [Your 2-3 paragraph story continuation here]

            <choices>
            1. [First choice description]
            2. [Second choice description]
            3. [Third choice description]
            </choices>

            Here's an example of how an interaction might look:

            <example>
                <story_context>
                Harry, Ron, and Hermione are sneaking through the corridors of Hogwarts at night. They've just heard a strange noise coming from the forbidden third-floor corridor.
                </story_context>

                <user_choice>
                Investigate the noise
                </user_choice>

                <story_continuation>
                Heart pounding, Harry led his friends towards the source of the mysterious sound. As they crept closer to the forbidden corridor, the noise grew louder – a low, rumbling growl that sent shivers down their spines. Ron's face paled in the dim wandlight, but Hermione's eyes sparkled with a mix of fear and curiosity.

                Rounding the corner, they froze in their tracks. Before them stood an enormous, three-headed dog, its massive paws planted firmly on a trapdoor. The beast's eyes locked onto the trio, and all three heads let out a thunderous bark that shook the very stones of the castle.
                </story_continuation>

                <choices>
                1. Attempt to distract the dog and slip past it to the trapdoor.
                2. Quickly retreat and try to find information about the three-headed dog in the library.
                3. Use a spell to try and calm the dog down.
                </choices>
            </example>

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

            this.generateAndSendImage(
                ctx,
                selectedChoice,
                lastMessageBefore,
                lastMessageBefore.content
            );

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
                messages: [
                    {
                        role: "user",
                        content:
                            "Rephrase and prepare for image generation this next part of my story Choice: " +
                            text +
                            " Last message in history: " +
                            contextMessage,
                    },
                ],
            });
            const response = await this.callStabilityAPI(rephrasedRes.content[0].text);
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
            });

            chat.history.push(inputMessage, { role: "assistant", content: storyPart });
            const choices = parseChoices(storyPart);
            chat.choices = choices;

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
            // Discord implementation here
        } catch (error) {
            console.error("Discord command error:", error);
        }
    }

    async generatePartOfStory({ inputMessage, history = [] }) {
        try {
            const response = await this.anthropic.messages.create({
                max_tokens: 8190,
                model: "claude-3-5-haiku-latest",
                system: "You are a creative and engaging storyteller. Your task is to generate the next part of an interactive and fun story based on the user's input. Make sure to keep the story coherent, imaginative, and entertaining. Respond in a way that encourages the user to continue the story with their own ideas.",
                messages: [...history, inputMessage],
            });

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
                            Markup.button.callback("🧙‍♂️ Fantasy", "genre_fantasy"),
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

    /**
     * Periodic cleanup of inactive chats
     */
    startCleanupInterval() {
        setInterval(() => {
            try {
                const now = new Date();
                Object.keys(this.chats).forEach(userId => {
                    if (!this.isValidChat(userId)) {
                        this.cleanupChat(userId);
                    }
                });
            } catch (error) {
                console.error("[CLEANUP_INTERVAL_ERROR]", error);
            }
        }, 5 * 60 * 1000); // Run every 5 minutes
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
