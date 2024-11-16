import { message } from "telegraf/filters";
import { saveHistory } from "../db.js";
import fs from "fs";
import os from "os";
import fetch from "node-fetch";
import path from "path";

const GHOSTWRITER_SYSTEM_MESSAGE = `
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
     * @param {import('telegraf').Telegraf} bot - Telegraf instance
     * @param {import("@anthropic-ai/sdk").Anthropic} anthropic - Anthropic instance
     * @param {Function} sendMenu - Menu sending function
     * @param {import("openai").OpenAI} openai - OpenAI instance
     * @description Handles the ghostwriter action
     * @constructor GhostwriterHandler
     * @returns {GhostwriterHandler}
     */
    constructor(args) {
        this.bot = args.bot;
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
                this.bot.telegram.deleteMessage(ctx.chat.id, ctx.message.message_id);
            } catch {}

            this.messageHash[userId] = 0;
            this.activeUsers.set(userId, "ghostwriterfromtexttoaudio");
        }

        if (name === "ghostwriteraudio") {
            const userId = ctx.from.id;
            try {
                this.bot.telegram.deleteMessage(ctx.chat.id, ctx.message.message_id);
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
                this.bot.telegram.deleteMessage(ctx.chat.id, ctx.message.message_id);
            } catch {}

            this.messageHash[userId] = 0;
            this.activeUsers.set(userId, "ghostwriter");
        }
        if (name === "ghostwriterfromtexttoaudio") {
            const userId = ctx.from.id;
            try {
                this.bot.telegram.deleteMessage(ctx.chat.id, ctx.message.message_id);
            } catch {}

            this.messageHash[userId] = 0;
            this.activeUsers.set(userId, "ghostwriterfromtexttoaudio");
        }
        if (name === "ghostwriteraudio") {
            const userId = ctx.from.id;
            try {
                this.bot.telegram.deleteMessage(ctx.chat.id, ctx.message.message_id);
            } catch {}

            this.messageHash[userId] = 0;
            this.activeUsers.set(userId, "ghostwriteraudio");
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
        if (this.messageHash[messageUserId] === 1) {
            return;
        }

        // Check if the message is from the user who initiated the command
        const activeuser = this.activeUsers.get(messageUserId);
        if (!activeuser || activeuser !== "ghostwriteraudio") {
            return;
        }

        // Check if the user has already completed their interaction
        if (this.messageHash[messageUserId] === 1) {
            return;
        }

        try {
            await ctx.deleteMessage(this.initialMessagesHash[messageUserId]);
        } catch {}

        try {
            await this.rephraseFromAudio(ctx);
        } catch (error) {
            console.error(error);
        }

        // Remove user from active users after handling their message
        this.activeUsers.delete(messageUserId);
    }

    async textToSpeech(ctx, text) {
        try {
            console.log("Generating speech from text:", text);
            const response = await this.openai.audio.speech.create({
                model: "tts-1-hd",
                voice: "alloy",
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
    async handleTextMessage(ctx) {
        const messageUserId = ctx.message.from.id;

        const activeuser = this.activeUsers.get(messageUserId);
        console.log("Active user:", activeuser);
        // Check if the message is from the user who initiated the command
        if (!activeuser) {
            return;
        }

        if (activeuser === "ghostwriterfromtexttoaudio") {
            return this.handleTextWithAudio(ctx);
        }
        if (activeuser !== "ghostwriter") {
            return;
        }

        // Check if the user has already completed their interaction
        if (this.messageHash[messageUserId] === 1) {
            return;
        }

        try {
            await ctx.deleteMessage(this.initialMessagesHash[messageUserId]);
        } catch {}

        try {
            let message = await this.rephraseTextMessage(ctx);
            console.log("Message:", message);
            await ctx.reply(message);
        } catch (error) {
            console.error(error);
        }

        // Remove user from active users after handling their message
        this.activeUsers.delete(messageUserId);
    }

    async handleTextWithAudio(ctx) {
        const messageUserId = ctx.message.from.id;

        try {
            await ctx.deleteMessage(this.initialMessagesHash[messageUserId]);
        } catch {}

        try {
            let message = await this.rephraseTextMessage(ctx);
            console.log("Message:", message);
            await this.textToSpeech(ctx, message);
        } catch (error) {
            console.error(error);
        }

        // Remove user from active users after handling their message
        this.activeUsers.delete(messageUserId);
    }

    /**
     * @param {import('telegraf').Context} ctx - Telegraf context
     * @returns {Promise<string>}
     * @description Handles the text message
     */
    async rephraseTextMessage(ctx) {
        try {
            await ctx.telegram.deleteMessage(ctx.chat.id, ctx.message.message_id);
        } catch {}

        const userText = ctx.message.text;

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
