import { Buffer } from "node:buffer";
import { saveHistory } from "../database/db.js"; // Added .js extension
import { parseOfficeAsync } from "officeparser";
import * as pdfjsLib from "pdfjs-dist";

export default class DockAsker {
    /**
     * @param {import('telegraf').Telegraf} bot - Telegraf instance
     * @param {object} anthropic - Anthropic client instance
     * @param {Function} sendMenu - Menu sending function
     * @description Handles the document parser and ai asking action
     * @constructor DockAsker
     * @returns {DockAsker}
     */
    constructor(args) {
        this.telegramBot = args.telegramBot;
        this.anthropic = args.anthropic;
        this.sendMenu = args.sendMenu;
        this.messageHash = {};
        this.activeUsers = new Set();
    }

    initAction(ctx, action) {
        if (action === "dockasker") {
            ctx.reply("Send me a file. (.docx, .txt, .xlsx, .pdf)");
            // this.setupMessageHandlers();
        }
    }
    initCommand(ctx, action) {
        if (action === "dockasker") {
            ctx.reply("Send me a file. (.docx, .txt, .xlsx, .pdf)");
            // this.setupMessageHandlers();
        }
    }
    async handleDiscordSlashCommand(interaction) {
        try {
            const userId = interaction.user.id;
            this.activeUsers.add(userId);

            await interaction.editReply("Supported file types: .txt, .pdf");
            // await interaction.deferReply();

            const inputText = interaction.options.getString("input");
            const docFile = interaction.options.getAttachment("attachment");

            // Check file size
            if (docFile.size > 8388608) {
                // 8MB limit for most bots
                return interaction.reply("File too large!");
            }

            console.log("inputText", inputText);
            console.log("docFile", docFile);

            const fileBlobResponse = await fetch(docFile.url);
            const fileBlob = await fileBlobResponse.blob();
            const fileType = docFile.contentType;
            const fileBuffer = await fileBlob.arrayBuffer();

            const context = {
                from: {
                    id: userId,
                },
                // ctx.message.document.mime_type
                message: {
                    document: {
                        file_id: docFile.id,
                        mime_type: docFile.contentType,
                        fileBlob: fileBlob,
                        fileType: fileType,
                        fileBuffer: fileBuffer,
                    },
                    text: inputText,
                    caption: inputText,
                },
                attachment: docFile,
                reply: async message => {
                    try {
                        await interaction.channel.send(message);
                    } catch (error) {
                        console.error("Error:", error);
                    }
                },
                userId: userId,
            };

            await this.handleDocumentMessage(context, docFile);
        } catch (error) {
            console.error("Error:", error);
        }
    }

    async handleDocumentMessage(ctx) {
        const fileType = ctx.message.document.mime_type;
        const validTypes = [
            "text/plain",
            "text/plain; charset=utf-8",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/pdf",
            "application/msword",
        ];

        console.log("File type:", fileType);
        if (!validTypes.includes(fileType)) {
            return ctx.reply(
                "Invalid file type. Please send a .txt, .pdf, .docx, .pdf, or .doc file."
            );
        }

        this.messageHash[ctx.from.id] = {
            fileId: ctx.message.document.file_id,
            fileType,
            fileBlob: ctx.message.document?.fileBlob,
            fileBuffer: ctx.message.document?.fileBuffer,
        };

        saveHistory({
            userId: ctx.from.id,
            userInput: "File received",
            botResponse: `File ID: ${ctx.message.document.file_id}`,
        });

        if (ctx.message.caption) {
            const userText = ctx.message.caption;
            await this.finishProcessing({ userText, ctx });
        } else {
            ctx.reply("File received. Now, please send me some text.");
        }
    }

    async handleTextMessage(ctx) {
        const userText = ctx.message.text;
        await this.finishProcessing({ userText, ctx });
    }

    async finishProcessing({ userText, ctx }) {
        const fileData = this.messageHash[ctx.from.id];

        if (!fileData) {
            ctx.reply("File not found. Please send a file first.");
            return this.sendMenu(ctx, "bruh, you need to send file first.");
        }

        console.log(`File ID: ${fileData.fileId}`);
        console.log(`User Text: ${userText}`);
        let fileContent = "";

        fileContent = await this.parseFile(fileData);

        if (!fileContent) {
            ctx.reply("Error parsing file. Please try again.");
            return this.sendMenu(ctx);
        }

        console.log(`File Content: ${fileContent}`);

        saveHistory({
            userId: ctx.from.id,
            userInput: "User text received",
            botResponse: userText,
        });

        if (userText.length > 150_000) {
            return ctx.reply(
                "Text is too long. Please send text with less than 150,000 characters."
            );
        }

        let aiRes = "";
        try {
            await ctx.reply("Processing...");

            const msg = await this.anthropic.messages.create({
                model: "claude-3-5-sonnet-20241022",
                max_tokens: 2048,
                messages: [
                    {
                        role: "assistant",
                        content: `
                            You are an AI assistant tasked with analyzing parsed text data from a file and generating an output based on this data and a user's message. Follow these instructions carefully:
                            1. First, you will be presented with parsed text data from a file. This data may contain various types of information, such as key-value pairs, lists, or structured text. The parsed text data will be provided within <parsed_text> tags:
                            2. Next, you will receive a message from the user. This message may contain a question, request, or instruction related to the parsed text data. The user message will be provided within <user_message> tags:
                            3. Your task is to analyze the parsed text data and the user message, and then generate an appropriate output. Follow these steps:
                            a. Carefully read and understand the parsed text data.
                            b. Interpret the user's message and identify what information or action they are requesting.
                            c. Search for relevant information within the parsed text data that addresses the user's message.
                            d. Formulate a response that answers the user's question or fulfills their request using the information from the parsed text data.
                            4. When generating your output, keep the following guidelines in mind:
                            - Provide clear and concise information directly related to the user's message.
                            - If the parsed text data doesn't contain information relevant to the user's message, state that clearly.
                            - If you need to make assumptions or inferences based on the available data, explain your reasoning.
                            - Use a friendly and helpful tone in your response.
                            5. Format your output as follows:
                            - Begin with a brief summary or direct answer to the user's message.
                            - If necessary, provide additional details or context from the parsed text data.
                            - If you're referencing specific parts of the parsed text, you may quote them directly, but use quotation marks and mention the source.
                            6. Enclose your entire response within <output> tags. For example:
                            Remember, your goal is to provide accurate and helpful information based on the parsed text data and the user's specific request or question. If you're unsure about any aspect of the data or the user's message, it's better to acknowledge that uncertainty rather than provide potentially incorrect information.`,
                    },
                    {
                        role: "user",
                        content: fileContent,
                    },
                    {
                        role: "user",
                        content: userText,
                    },
                ],
            });

            aiRes = msg.content[0].text;
        } catch (err) {
            console.error(err);
            saveHistory({
                userId: ctx.from.id,
                userInput: "AI error",
                botResponse: `Error: ${err.message}`,
            });
        }

        if (!aiRes) {
            ctx.reply("An error occurred. Please try again.");
            return this.sendMenu(ctx);
        }

        saveHistory({
            userId: ctx.from.id,
            userInput: "AI response",
            botResponse: aiRes,
        });

        await ctx.reply(`AI Response: ${aiRes}`);
        this.sendMenu(ctx, "Congrats, you got a response.");
    }

    async parseFile(fileData) {
        let fileBlob;
        let fileLink;

        try {
            fileLink = await this.telegramBot.telegram.getFileLink(fileData.fileId);
            fileBlob = await fetch(fileLink);
        } catch (err) {
            console.error(err);
        }

        if (!fileBlob) {
            fileBlob = fileData.fileBlob;
        }

        const handleTextPlain = async fileBlob => {
            try {
                const fileBuffer = await fileBlob.arrayBuffer();
                const fileContent = new TextDecoder().decode(fileBuffer);
                return fileContent;
            } catch (error) {
                console.error("Error handling text file:", error);
                return null;
            }
        };

        const handle = {
            "text/plain": handleTextPlain,
            "text/plain; charset=utf-8": handleTextPlain,
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
                async fileBlob => {
                    try {
                        const buffer = await fileBlob.arrayBuffer();
                        const fileBuffer = Buffer.from(buffer);
                        const data = await parseOfficeAsync(fileBuffer);
                        return data.toString();
                    } catch (error) {
                        console.error("Error handling Word:", error);
                        return null;
                    }
                },
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": async fileBlob => {
                try {
                    const buffer = await fileBlob.arrayBuffer();
                    const fileBuffer = Buffer.from(buffer);
                    const data = await parseOfficeAsync(fileBuffer);
                    return data.toString();
                } catch (error) {
                    console.error("Error handling Excel:", error);
                    return null;
                }
            },
            "application/pdf": async () => {
                try {
                    const buffer = await fileBlob.arrayBuffer();
                    const result = await PDFParser.parsePDF(buffer);

                    if (result) {
                        return result;
                    }
                } catch (error) {
                    console.error("Error handling PDF:", error);
                    return null;
                }
            },
            "application/msword": async fileBlob => {
                try {
                    const fileBuffer = await fileBlob.arrayBuffer();
                    const fileContent = new TextDecoder().decode(fileBuffer);
                    return fileContent;
                } catch (error) {
                    console.error("Error handling text file:", error);
                    return null;
                }
            },
        };

        if (handle[fileData.fileType]) {
            return handle[fileData.fileType](fileBlob);
        } else {
            throw new Error("Unsupported file type.");
        }
    }
}

class PDFParser {
    static async parsePDF(fileBuffer) {
        try {
            const loadingTask = pdfjsLib.getDocument({ data: fileBuffer });
            const pdf = await loadingTask.promise;
            let text = "";

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const content = await page.getTextContent();
                text += content.items.map(item => item.str).join(" ") + "\n";
            }

            return text;
        } catch (error) {
            console.error("Error parsing PDF:", error);
            return null;
        }
    }

    static async parseFromBuffer(fileBuffer) {
        try {
            const data = await pdf(fileBuffer);
            return {
                success: true,
                text: data.text,
                info: data.info,
                metadata: data.metadata,
                numPages: data.numpages,
            };
        } catch (error) {
            console.error("PDF parsing error:", error);
            return {
                success: false,
                error: error.message,
            };
        }
    }

    static async parseFromURL(url) {
        try {
            const response = await fetch(url);
            const buffer = await response.arrayBuffer();
            const fileBuffer = Buffer.from(buffer);
            return await this.parseFromBuffer(fileBuffer);
        } catch (error) {
            console.error("PDF download error:", error);
            return {
                success: false,
                error: error.message,
            };
        }
    }
}
