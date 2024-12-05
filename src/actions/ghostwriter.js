import { saveHistory, updateTokensTracking } from "../database/db.js";
import fs from "fs";
import os from "os";
import fetch from "node-fetch";
import path from "path";
import { AttachmentBuilder } from "discord.js";

export const GHOSTWRITER_SYSTEM_MESSAGE = `
    You are a ghostwriter tasked with rephrasing angry or hateful messages into more constructive and less inflammatory language. Your goal is to maintain the core message while removing aggressive tone, insults, and offensive language. Follow these guidelines:

    1. Identify the main point or concern in the original message.
    2. Remove any explicit insults, curse words, or derogatory language.
    3. Replace aggressive tone with more neutral or assertive language.
    4. Maintain the original intent but express it in a more respectful manner.
    5. If applicable, suggest constructive solutions or actions.
    6. Ensure the rephrased message is clear, concise, and professional.
    7. Do not respond from your own perspective or provide any commentary.
    8. Only deliver the rephrased version as if it were written by the user, and avoid apologies or disclaimers.
    8. Be as more positive as possible.
    9. Do not express any negative emotions.
    10. Do not use any offensive language.
    11. Do not use frustrates or angry words.
    12. Response only in english.
`;

class GhostwriterHandler {
    /**
     * @type {import('@slack/bolt').App}
     */
    slackBot;
    /**
     * @type {import('openai').OpenAI}
     */
    openai;

    /**
     * @param {import('telegraf').Telegraf} bot - Telegraf instance
     * @param {import("@anthropic-ai/sdk").Anthropic} anthropic - Anthropic instance
     * @param {Function} sendMenu - Menu sending function
     * @param {import("openai").OpenAI} openai - OpenAI instance
     * @description Handles the ghostwriter action
     * @constructor GhostwriterHandler
     * @returns {GhostwriterHandler}
     */
    constructor(args) {
        this.telegramBot = args.telegramBot;
        this.anthropic = args.anthropic;
        this.openai = args.openai;
        this.sendMenu = args.sendMenu;

        this.messageHash = {};
        this.initialMessagesHash = {};
        this.activeUsers = new Map();
        this.maxFileSize = 15 * 1024 * 1024; // 15 MB
        this.maxTextLength = 150_000;
    }

    async initAction(ctx, name) {
        if (name === "ghostwriter") {
            const userId = ctx.from.id;
            const initialMsg = await ctx.reply("Write me text");
            this.messageHash[userId] = 0;
            this.initialMessagesHash[userId] = initialMsg.message_id;

            this.activeUsers.set(userId, "ghostwriter");
        }

        if (name === "ghostwriterfromtexttoaudio") {
            const userId = ctx.from.id;
            try {
                this.telegramBot.telegram.deleteMessage(ctx.chat.id, ctx.message.message_id);
            } catch {}

            this.messageHash[userId] = 0;
            this.activeUsers.set(userId, "ghostwriterfromtexttoaudio");
        }

        if (name === "ghostwriteraudio") {
            const userId = ctx.from.id;
            try {
                this.telegramBot.telegram.deleteMessage(ctx.chat.id, ctx.message.message_id);
            } catch {}

            this.messageHash[userId] = 0;
            this.activeUsers.set(userId, "ghostwriteraudio");
        }
    }

    initCommand(ctx, name) {
        console.log("Init command:", name);
        if (name === "ghostwriter") {
            const userId = ctx.from.id;
            try {
                this.telegramBot.telegram.deleteMessage(ctx.chat.id, ctx.message.message_id);
            } catch {}

            this.messageHash[userId] = 0;
            this.activeUsers.set(userId, "ghostwriter");
        }
        if (name === "ghostwriterfromtexttoaudio") {
            const userId = ctx.from.id;
            try {
                this.telegramBot.telegram.deleteMessage(ctx.chat.id, ctx.message.message_id);
            } catch {}

            this.messageHash[userId] = 0;
            this.activeUsers.set(userId, "ghostwriterfromtexttoaudio");
        }
        if (name === "ghostwriteraudio") {
            const userId = ctx.from.id;
            try {
                this.telegramBot.telegram.deleteMessage(ctx.chat.id, ctx.message.message_id);
            } catch {}

            this.messageHash[userId] = 0;
            this.activeUsers.set(userId, "ghostwriteraudio");
        }
    }

    /**
     * @param {import('@slack/bolt').SlackCommandMiddlewareArgs} context - Slack
     */
    async handleSlackCommand(context) {
        const body = context.body;
        console.log("Handling slack command:", this.slackBot);
        const text = body.text;
        const command = body.command.replace("/", "");
        const userId = body.user_id;

        if (command === "ghostwriter") {
            this.messageHash[userId] = 0;
            this.activeUsers.set(userId, "ghostwriter");

            const innerContext = {
                from: {
                    id: userId,
                    first_name: body.user_name,
                    last_name: "",
                },
                chat: {
                    id: body?.channel_id || "",
                },
                userId: userId,

                reply: async message => {
                    await context.ack({
                        text: message,
                    });
                },
            };

            try {
                const message = await this.rephraseTextMessage(innerContext, text);
                await context.respond(message);
            } catch (error) {
                console.error("Error in ghostwriter:", error);
            }

            this.messageHash[userId] = 1;
        }

        if (command === "ghostwriterfromtexttoaudio") {
            this.messageHash[userId] = 0;
            this.activeUsers.set(userId, "ghostwriterfromtexttoaudio");

            const innerContext = {
                from: {
                    id: userId,
                    first_name: body.user_name,
                    last_name: "",
                },
                chat: {
                    id: body?.channel_id || "",
                },
                userId: userId,

                reply: async message => {
                    await context.respond(message);
                },
                /**
                 * @param {string} tempFile
                 */
                replyWithVoice: async tempFile => {
                    try {
                        const buffer = fs.readFileSync(tempFile.source);

                        const formData = new FormData();
                        formData.append("channels", body.channel_id);
                        formData.append("file", new Blob([buffer]), "voice.mp3");

                        const response = await this.slackBot.client.files.uploadV2({
                            channels: body.channel_id,
                            file: buffer,
                            filename: "voice.mp3",
                        });

                        console.log("Response:", response);

                        // if (!response.ok) {
                        //     console.error("Error sending voice message:", response.statusText);
                        // }
                    } catch (error) {
                        console.error("Error sending voice message:", error);
                    }
                },
            };

            try {
                this.rephraseTextMessage.bind(this);
                const message = await this.rephraseTextMessage(innerContext, text);
                await this.textToSpeech(innerContext, message);
            } catch (error) {
                console.error("Error in ghostwriterfromtexttoaudio:", error);
            }

            this.messageHash[userId] = 1;
        }

        if (command === "ghostwriteraudio") {
            this.messageHash[userId] = 0;
            this.activeUsers.set(userId, "ghostwriteraudio");

            if (!context.replied && context.deferred) {
                try {
                    await context.ack({
                        text: "Not implemented in Slack yet",
                    });
                } catch (error) {
                    console.error("Error replying to interaction:", error);
                }
            }
        }
    }
    /**
     * @param {import ('discord.js').Interaction} interaction - Discord interaction
     * @param {string} actionName - Action name
     * @returns {Promise<void>}
     */
    async handleDiscordSlashCommand(interaction, actionName) {
        console.log("Execution of discord slash command:", actionName);
        const textInput = interaction.options.getString("input");

        console.log("Text input:", textInput);

        if (actionName === "ghostwriter") {
            const userId = interaction.member?.user?.id || interaction.user.id;
            this.messageHash[userId] = 0;
            this.activeUsers.set(userId, "ghostwriter");

            const context = {
                from: {
                    id: userId,
                    first_name: interaction.member?.user?.username || interaction.user.globalName,
                    last_name: "",
                },
                chat: {
                    id: interaction.channel.id,
                },
                userId: userId,
                reply: async message => {
                    try {
                        await interaction.channel.send(message);
                    } catch (error) {
                        console.error("Error replying to interaction:", error);
                    }
                },
            };

            const aiRes = await this.rephraseTextMessage(context, textInput);

            try {
                if (!interaction.replied && interaction.deferred) {
                    await interaction.editReply(aiRes);
                } else {
                    await interaction.reply(aiRes);
                }
            } catch (error) {
                console.error("Error replying to interaction:", error);
            }

            this.messageHash[userId] = 1;
        }

        if (actionName === "ghostwriterfromtexttoaudio") {
            try {
                const userId = interaction.member?.user?.id || interaction.user.id;
                this.messageHash[userId] = 0;
                this.activeUsers.set(userId, "ghostwriterfromtexttoaudio");

                if (!interaction.replied && interaction.deferred) {
                    try {
                        await interaction.editReply("Processing...");
                    } catch (error) {
                        console.error("Error replying to interaction:", error);
                    }
                }

                const context = {
                    from: {
                        id: userId,
                        first_name:
                            interaction.member?.user?.username || interaction.user.globalName,
                        last_name: "",
                    },
                    chat: {
                        id: interaction.channel.id,
                    },
                    userId: userId,
                    reply: async message => {},
                    /**
                     * @param {string} tempFile
                     */
                    replyWithVoice: async tempFile => {
                        try {
                            const buffer = fs.readFileSync(tempFile.source);

                            const attachment = new AttachmentBuilder(buffer, {
                                name: "voice.mp3",
                            });

                            interaction.channel.send({
                                files: [attachment],
                            });
                        } catch (error) {
                            console.error("Error sending voice message:", error);
                        }
                    },
                };

                const aiRes = await this.rephraseTextMessage(context, textInput);

                await this.textToSpeech(context, aiRes);
                interaction.channel.send(aiRes);

                this.messageHash[userId] = 1;
            } catch (error) {
                console.error("Error in ghostwriterfromtexttoaudio:", error);
            }
        }

        if (actionName === "ghostwriteraudio") {
            const userId = interaction.member?.user?.id || interaction.user.id;
            this.messageHash[userId] = 0;
            this.activeUsers.set(userId, "ghostwriteraudio");

            if (interaction.deferred && !interaction.replied) {
                await interaction.editReply("Not implemented in Discord yet");
            }
        }
    }

    async downloadVoiceMessage(ctx) {
        try {
            const fileId = ctx.message.voice.file_id;
            const file = await ctx.telegram.getFile(fileId);
            const filePath = file.file_path;

            // Get the direct URL
            const fileUrl = `https://api.telegram.org/file/bot${ctx.telegram.token}/${filePath}`;

            // Download with proper headers
            const response = await fetch(fileUrl, {
                method: "GET",
                headers: {
                    Accept: "audio/*",
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Get the buffer directly
            const buffer = await response.arrayBuffer();

            // Create file with proper MIME type
            const audioFile = new File([buffer], "audio.ogg", { type: "audio/ogg" });

            // Log file details for debugging
            console.log("File size:", buffer.byteLength);
            console.log("File type:", audioFile.type);

            // Verify the file is not empty
            if (buffer.byteLength < 1000) {
                throw new Error("Downloaded file is too small");
            }

            return audioFile;
        } catch (error) {
            console.error("Error downloading voice message:", error);
            throw error;
        }
    }

    /**
     * @param {import('telegraf').Context} ctx - Telegraf context
     * @returns {Promise<void>}
     */
    async handleVoiceMessage(ctx) {
        const messageUserId = ctx.message.from.id;

        try {
            await ctx.deleteMessage(this.initialMessagesHash[messageUserId]);
        } catch {}

        try {
            await this.rephraseFromAudio(ctx);
        } catch (error) {
            console.error(error);
        }
    }

    async textToSpeech(ctx, text) {
        try {
            console.log("Generating speech from text:", text);
            const response = await this.openai.audio.speech.create({
                model: "tts-1-hd",
                voice: "nova",
                input: text,
                response_format: "mp3",
            });

            // Create temporary file path
            const tempFile = path.join(os.tmpdir(), `speech-${Date.now()}.mp3`);

            // Get the binary data as a stream
            const stream = response.body;

            // Create write stream
            const writeStream = fs.createWriteStream(tempFile);

            // Pipe the response to the file
            for await (const chunk of stream) {
                writeStream.write(chunk);
            }
            writeStream.end();

            // Wait for the file to be written
            await new Promise(resolve => writeStream.on("finish", resolve));

            // Send the file
            await ctx.replyWithVoice({
                source: tempFile,
            });
            // await ctx.replyWithVoice(attachment);

            // Clean up
            fs.unlinkSync(tempFile);

            // Send text as a message
            await ctx.reply(text);
        } catch (error) {
            console.error("Error in text-to-speech:", error);
            await ctx.reply("Sorry, there was an error generating the voice message.");
        }
    }

    async rephraseFromAudio(ctx) {
        let userText = "";

        try {
            const audioFile = await this.downloadVoiceMessage(ctx);

            if (audioFile.size > this.maxFileSize) {
                return await ctx.reply(
                    "File is too large. Please send an audio file with less than 15 MB."
                );
            }

            const transcription = await this.openai.audio.transcriptions.create({
                file: audioFile,
                model: "whisper-1",
                response_format: "text",
            });

            console.log("User text:", transcription);

            saveHistory({
                userId: ctx.from.id,
                userInput: transcription,
                botResponse: `User Name: ${ctx.from.first_name} ${ctx.from.last_name}`,
            });

            if (transcription.length > this.maxTextLength) {
                return await ctx.reply(
                    `Text is too long. Please send text with less than ${this.maxTextLength} characters.`
                );
            }

            userText = transcription;
        } catch (err) {
            console.error("Error in audio transcription:", err);
            saveHistory({
                userId: ctx.from.id,
                userInput: "Transcription error",
                botResponse: `Error: ${err.message}`,
            });
        }

        let aiRes = "";
        try {
            const completion = await this.openai.chat.completions.create({
                model: "gpt-4o",
                temperature: 0.0,
                messages: [
                    {
                        role: "system",
                        content: GHOSTWRITER_SYSTEM_MESSAGE,
                    },
                    {
                        role: "user",
                        content: "rephrase that message: " + userText,
                    },
                ],
            });

            updateTokensTracking(
                ctx,
                {
                    usage: {
                        input_tokens: completion.usage?.completion_tokens,
                        output_tokens: completion.usage?.prompt_tokens,
                    },
                },
                "ghostwriter"
            );

            aiRes = completion.choices[0].message.content;
        } catch (err) {
            console.error(err);
            saveHistory({
                userId: ctx.from.id,
                userInput: "AI error",
                botResponse: `Error: ${err.message}`,
            });
        }

        if (!aiRes) {
            await ctx.reply("An error occurred. Please try again.");
            return this.sendMenu(ctx);
        }

        saveHistory({
            userId: ctx.from.id,
            userInput: "AI response",
            botResponse: aiRes,
        });

        try {
            await this.textToSpeech(ctx, aiRes);
        } catch (error) {
            console.error(error);
        }

        this.messageHash[ctx.userId] = 1;
    }

    /**
    @param {import('telegraf').Context} ctx - Telegraf context
  */
    async handleTextMessage(ctx, actionName) {
        const messageUserId = ctx.message.from.id;

        if (actionName === "ghostwriterfromtexttoaudio") {
            return this.handleTextWithAudio(ctx);
        }
        if (actionName !== "ghostwriter") {
            return;
        }

        try {
            await ctx.deleteMessage(this.initialMessagesHash[messageUserId]);
        } catch {}

        try {
            try {
                await ctx.telegram.deleteMessage(ctx.chat.id, ctx.message.message_id);
            } catch {}

            let message = await this.rephraseTextMessage(ctx, ctx.message.text);
            console.log("Message:", message);
            await ctx.reply(message);
        } catch (error) {
            console.error(error);
        }
    }

    async handleTextWithAudio(ctx) {
        const messageUserId = ctx.message.from.id;

        try {
            await ctx.deleteMessage(this.initialMessagesHash[messageUserId]);
        } catch {}

        try {
            try {
                await ctx.telegram.deleteMessage(ctx.chat.id, ctx.message.message_id);
            } catch {}

            let message = await this.rephraseTextMessage(ctx, ctx.message.text);
            console.log("Message:", message);
            await this.textToSpeech(ctx, message);
        } catch (error) {
            console.error(error);
        }
    }

    /**
     * @param {import('telegraf').Context} ctx - Telegraf context
     * @param {string} text - User text message
     * @returns {Promise<string>}
     * @description Handles the text message
     */
    async rephraseTextMessage(ctx, text) {
        const userText = text;

        saveHistory({
            userId: ctx.from.id,
            userInput: userText,
            botResponse: `User Name: ${ctx.from.first_name} ${ctx.from.last_name || ""}`,
        });

        if (userText.length > this.maxTextLength) {
            return await ctx.reply(
                `Text is too long. Please send text with less ${this.maxTextLength},000 characters.`
            );
        }

        let aiRes = "";
        try {
            const completion = await this.openai.chat.completions.create({
                model: "gpt-4o",
                temperature: 0.5,
                messages: [
                    {
                        role: "system",
                        content: GHOSTWRITER_SYSTEM_MESSAGE,
                    },
                    {
                        role: "user",
                        content: "rephrase that message: " + userText,
                    },
                ],
            });

            updateTokensTracking(
                ctx,
                {
                    usage: {
                        input_tokens: completion.usage?.completion_tokens,
                        output_tokens: completion.usage?.prompt_tokens,
                    },
                },
                "ghostwriter"
            );

            aiRes = completion.choices[0].message.content;

            console.log("AI response:", aiRes);
        } catch (err) {
            console.error(err);
            saveHistory({
                userId: ctx.from.id,
                userInput: "AI error",
                botResponse: `Error: ${err.message}`,
            });
        }

        if (!aiRes) {
            await ctx.reply("An error occurred. Please try again.");
            return this.sendMenu(ctx);
        }

        saveHistory({
            userId: ctx.from.id,
            userInput: "AI response",
            botResponse: aiRes,
        });

        // await ctx.telegram.sendMessage(ctx.chat.id, aiRes);

        this.messageHash[ctx.userId] = 1;

        return aiRes;
    }
}

export default GhostwriterHandler;
