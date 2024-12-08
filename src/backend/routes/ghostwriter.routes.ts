import { Elysia, t } from "elysia";
import type Anthropic from "@anthropic-ai/sdk";
import type OpenAI from "openai";
import type UserManager from "../../user-manager";
import type { Context, Telegraf } from "telegraf";
import GhostwriterHandler, { GHOSTWRITER_SYSTEM_MESSAGE } from "../../actions/ghostwriter";
import { saveHistory, updateTokensTracking } from "../../database/db";

export const ghostwriterRoutes = (deps: {
    anthropic: Anthropic;
    openai: OpenAI;
    userManager: UserManager;
}) =>
    new Elysia()
        .get(
            "ghostwriter",

            async request => {
                const query = request.query;
                const phrase = query.phrase;
                const authenticate = (request as any).authenticate;
                const user = await authenticate();

                const handler = new GhostwriterHandler({
                    ...deps,
                });

                const rephrased = await handler.rephraseTextMessage(
                    {
                        from: {
                            id: user.user_id,
                            username: user.username,
                        },
                        reply: () => {},
                    } as unknown as Context,
                    phrase
                );

                return rephrased;
            },
            {
                query: t.Object({
                    phrase: t.String({
                        minLength: 20,
                        description: "Phrase that should be rephrased.",
                    }),
                }),
                detail: {
                    summary: "Make polite message",
                    tags: ["Ghostwriter"],
                },
            }
        )
        .post(
            "ghostwriteraudio",
            async request => {
                const body = request.body;
                const authenticate = (request as any).authenticate;
                const user = await authenticate();

                if (!body.file) {
                    throw new Error("No audio file provided");
                }

                try {
                    // Validate file size (15MB limit)
                    if (body.file.size > 15 * 1024 * 1024) {
                        throw new Error(
                            "File is too large. Please send an audio file with less than 15 MB."
                        );
                    }

                    // Transcribe audio to text
                    const transcription = await deps.openai.audio.transcriptions.create({
                        file: body.file,
                        model: "whisper-1",
                        response_format: "text",
                    });

                    // Validate transcription length
                    const maxTextLength = 1000; // Adjust as needed
                    if (transcription.length > maxTextLength) {
                        throw new Error(
                            `Text is too long. Please send text with less than ${maxTextLength} characters.`
                        );
                    }

                    // Get AI rephrasing
                    const completion = await deps.openai.chat.completions.create({
                        model: "gpt-4",
                        temperature: 0.0,
                        messages: [
                            {
                                role: "system",
                                content: GHOSTWRITER_SYSTEM_MESSAGE,
                            },
                            {
                                role: "user",
                                content: "rephrase that message: " + transcription,
                            },
                        ],
                    });

                    const rephrasedText = completion.choices[0].message.content;

                    // Generate speech from rephrased text
                    const mp3 = await deps.openai.audio.speech.create({
                        model: "tts-1",
                        voice: "alloy",
                        input: rephrasedText!,
                    });

                    // Convert audio to Buffer
                    const audioBuffer = Buffer.from(await mp3.arrayBuffer());

                    // Save history if needed
                    await saveHistory({
                        userId: user.user_id,
                        userInput: transcription,
                        botResponse: rephrasedText || "",
                    });

                    // Return both text and audio
                    return {
                        original: transcription,
                        rephrased: rephrasedText,
                        audio: audioBuffer.toString("base64"), // Convert buffer to base64 for transmission
                        contentType: "audio/mpeg",
                    };
                } catch (error) {
                    console.error("Error processing audio:", error);
                    throw new Error(`Processing failed: ${error.message}`);
                }
            },
            {
                body: t.Object({
                    file: t.File({
                        type: ["audio/wav", "audio/mpeg", "audio/mp3", "audio/ogg"],
                        maxSize: 15 * 1024 * 1024,
                    }),
                }),
                detail: {
                    summary: "Convert audio to text, rephrase it, and convert back to audio",
                    tags: ["Ghostwriter"],
                },
            }
        )
        .post(
            "ghostwritertext",
            async request => {
                const body = request.body;
                const authenticate = (request as any).authenticate;
                const user = await authenticate();

                try {
                    const { text } = body;

                    // Validate text length
                    const maxTextLength = 1000; // Adjust as needed
                    if (text.length > maxTextLength) {
                        throw new Error(
                            `Text is too long. Please send text with less than ${maxTextLength} characters.`
                        );
                    }

                    // Get AI rephrasing
                    const completion = await deps.openai.chat.completions.create({
                        model: "gpt-4",
                        temperature: 0.0,
                        messages: [
                            {
                                role: "system",
                                content: GHOSTWRITER_SYSTEM_MESSAGE,
                            },
                            {
                                role: "user",
                                content: "rephrase that message: " + text,
                            },
                        ],
                    });

                    const rephrasedText = completion.choices[0].message.content;

                    // Track token usage if needed
                    updateTokensTracking(
                        {
                            from: {
                                id: user.user_id,
                            },
                        } as Context,
                        {
                            usage: {
                                input_tokens: completion.usage?.completion_tokens,
                                output_tokens: completion.usage?.prompt_tokens,
                            },
                        },
                        "ghostwriter"
                    );

                    // Generate speech from rephrased text
                    const mp3 = await deps.openai.audio.speech.create({
                        model: "tts-1",
                        voice: "alloy", // Can be made configurable: alloy, echo, fable, onyx, nova, shimmer
                        input: rephrasedText!,
                    });

                    // Convert audio to Buffer
                    const audioBuffer = Buffer.from(await mp3.arrayBuffer());

                    // Save history if needed
                    await saveHistory({
                        userId: user.user_id,
                        userInput: text,
                        botResponse: rephrasedText!,
                    });

                    // Return both text and audio
                    return {
                        original: text,
                        rephrased: rephrasedText,
                        audio: audioBuffer.toString("base64"),
                        contentType: "audio/mpeg",
                        usage: {
                            completion_tokens: completion.usage?.completion_tokens,
                            prompt_tokens: completion.usage?.prompt_tokens,
                        },
                    };
                } catch (error) {
                    console.error("Error processing text:", error);
                    throw new Error(`Processing failed: ${error.message}`);
                }
            },
            {
                body: t.Object({
                    text: t.String({
                        minLength: 1,
                        maxLength: 1000,
                        description: "Text to be rephrased and converted to speech",
                    }),
                    voice: t.Optional(
                        t.String({
                            enum: ["alloy", "echo", "fable", "onyx", "nova", "shimmer"],
                            default: "alloy",
                            description: "Voice to be used for text-to-speech",
                        })
                    ),
                }),
                detail: {
                    summary: "Rephrase text and convert to audio",
                    tags: ["Ghostwriter"],
                    description:
                        "Takes text input, rephrases it using AI, and converts the result to speech",
                    responses: {
                        200: {
                            description: "Successful response with rephrased text and audio",
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            original: { type: "string" },
                                            rephrased: { type: "string" },
                                            audio: { type: "string", format: "base64" },
                                            contentType: { type: "string" },
                                            usage: {
                                                type: "object",
                                                properties: {
                                                    completion_tokens: { type: "number" },
                                                    prompt_tokens: { type: "number" },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                        400: {
                            description: "Bad request - invalid input",
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            error: { type: "string" },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            }
        );
