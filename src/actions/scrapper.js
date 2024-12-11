import puppeteer from "puppeteer";
import { databaseManager, updateTokensTracking } from "../database/db";
import { timeout } from "puppeteer";

const markdownToTelegramHTML = markdown => {
    if (!markdown) return "";

    let text = markdown;

    // Escape special HTML characters
    text = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    // Bold: **text** or __text__ to <b>text</b>
    text = text.replace(/(\*\*|__)(?=\S)([^\r]*?\S[*_]*)\1/g, "<b>$2</b>");

    // Italic: *text* or _text_ to <i>text</i>
    text = text.replace(/(\*|_)(?=\S)([^\r]*?\S)\1/g, "<i>$2</i>");

    // Strikethrough: ~~text~~ to <s>text</s>
    text = text.replace(/~~(?=\S)([^\r]*?\S)~~/g, "<s>$1</s>");

    // Code: `text` to <code>text</code>
    text = text.replace(/`([^`]+)`/g, "<code>$1</code>");

    // Pre: ```text``` to <pre>text</pre>
    text = text.replace(/```([^`]+)```/g, "<pre>$1</pre>");

    // Links: [text](url) to <a href="url">text</a>
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

    // Line breaks
    text = text.replace(/\n/g, "\n");

    return text;
};

class ScrapperHandler {
    /**
     * @type {import("telegraf").Telegraf}
     */
    telegramBot;

    /**
     * @type {import("@anthropic-ai/sdk").Anthropic}
     */
    anthropic;

    /**
     * @type {import("discord.js").Client}
     */
    discordBot;

    /**
     * @type {Function}
     */
    sendMenu;

    /**
     * @type {import("openai").OpenAI}
     */
    openai;

    /**
     * @type {number}
     */
    maxActiveSearches;

    /**
     * @type {SearchEngine}
     */
    searchEngine;
    constructor(args) {
        for (const key in args) {
            this[key] = args[key];
        }
        this.activeSearches = [];
        this.maxActiveSearches = 2;
        this.searchEngine = new SearchEngine();
    }

    initCommand(ctx, actionName) {
        ctx.reply("Please provide a search query.");
    }
    initAction(ctx, actionName) {
        ctx.reply("Please provide a search query.");
    }
    handleTextMessage(ctx, actionName) {
        if (actionName === "scrapper") {
            this.handleScrapper(ctx, "html");
        }
        if (actionName === "scrapperrecursive") {
            this.handleScrapperRecursive(ctx, actionName);
        }
    }
    async handleSearch(query, deep, user) {
        try {
            let response = "";
            if (deep) {
                response = await this.handleScrapperRecursive({
                    from: {
                        username: user?.username || "web",
                        id: user?.user_id || "web",
                    },
                    message: {
                        text: query,
                    },
                    reply: () => {},
                    replyWithHTML: () => {},
                });

                console.log("Scrapper API response: ", response);
            } else {
                response = await this.handleScrapper(
                    {
                        from: {
                            username: user?.username || "web",
                            id: user?.user_id || "web",
                        },
                        message: {
                            text: query,
                        },
                        reply: () => {},
                        replyWithHTML: () => {},
                    },
                    "html"
                );
            }

            return response;
        } catch (err) {
            console.error(err);
        }
    }

    /**
     * @param {import('@slack/bolt').SlackCommandMiddlewareArgs} context - Slack
     */
    handleSlackCommand(context) {
        this.handleScrapper(
            {
                message: {
                    text: context.body.text,
                },
                from: {
                    id: context.body.user_id,
                },

                reply: async text => {
                    try {
                        await context.ack();
                        await context.say(text);
                    } catch (error) {
                        console.error("Failed to reply to slack command:", error);
                    }
                },

                replyWithHTML: async text => {
                    try {
                        await context.ack();
                        const chunks = text.match(/[\s\S]{1,1000}/g) || [];
                        for (const chunk of chunks) {
                            await context.say({
                                text: chunk,
                                blocks: [
                                    {
                                        type: "section",
                                        text: {
                                            type: "mrkdwn",
                                            text: chunk,
                                        },
                                    },
                                ],
                            });
                        }
                    } catch (error) {
                        console.error("Failed to reply to slack command with HTML:", error);
                    }
                },
            },
            "markdown"
        );
    }

    /**
     *
     * @param {import("discord.js").CommandInteraction} interaction
     */
    async handleDiscordSlashCommand(interaction) {
        try {
            const { options } = interaction;
            const prompt = options.getString("input");
            const context = {
                message: {
                    text: prompt,
                },
                from: {
                    id: interaction.user.id,
                },
                reply: async text => {
                    try {
                        await interaction.deferReply();
                        await interaction.editReply(text);
                    } catch (error) {
                        console.error("Failed to reply to discord interaction:", error);
                    }
                },
                replyWithHTML: async text => {
                    try {
                        if (!interaction.deferred && !interaction.replied) {
                            await interaction.deferReply();
                        }

                        const chunks = text.match(/[\s\S]{1,2000}/g) || [];

                        for (const chunk of chunks) {
                            await interaction.channel.send({
                                content: chunk,
                                allowedMentions: { parse: [] },
                            });
                        }

                        if (interaction.deferred) {
                            await interaction.editReply("Done.");
                        }
                    } catch (error) {
                        console.error("Failed to reply to discord interaction with HTML:", error);
                    }
                },
            };
            await this.handleScrapper(context, "markdown");
        } catch (error) {
            console.error("Failed to handle discord slash command:", error);
        }
    }

    /**
     * @param {import("telegraf").Context} ctx
     * @returns {Promise<void>}
     * @description Handles scrapper action
     */
    async handleScrapper(ctx, outputFormat = "html") {
        ctx.reply("scrapping web...");

        const activeSearches = this.activeSearches.length;
        const userId = ctx.from.id;
        let commandCount = 1;
        const db = await databaseManager.getDatabase();

        try {
            const { data, error } = await db
                .from("interactions")
                .select("*")
                .eq("action_name", "scrapper")
                .eq("user_id", userId)
                .order("id", { ascending: false });

            if (error) {
                throw error;
            }

            commandCount = data?.[0]?.count || 1;
        } catch (err) {
            console.log(err);
        }

        try {
            const { data: dataUpdate, error } = await db
                .from("interactions")
                .upsert({
                    user_id: userId,
                    count: commandCount + 1,
                    action_name: "scrapper",
                })
                .select("*")
                .eq("user_id", userId);

            console.log("Update interaction: ", dataUpdate, error);
        } catch (err) {
            console.log(err);
        }

        console.log("Active searches:", activeSearches);

        if (activeSearches >= this.maxActiveSearches) {
            return ctx.reply(`Too many active searches. Please wait.`);
        }

        this.activeSearches.push(ctx.from.id);

        let prompt = ctx.message.text;

        if (!prompt) {
            return ctx.reply("No search query provided.");
        }

        console.log("Search query:", prompt);

        let data;
        try {
            const data1 = await this.searchEngine.search(prompt, "duckduckgo");
            const data2 = await this.searchEngine.search(prompt, "google");
            const data3 = await this.searchEngine.search(prompt, "bing");

            data = [data1, data2, data3].reduce((acc, curr) => {
                console.log("Search Engine Data:", curr);
                if (curr.success) {
                    const mergedResults = acc;
                    for (const result of curr.organic_results) {
                        if (!mergedResults.some(r => r.link === result.link)) {
                            mergedResults.push(result);
                        }
                    }
                    return mergedResults;
                }
                return acc;
            }, []);
        } catch (error) {
            console.error("Failed to fetch search results:", error);
        }

        if (!data || !data.length) {
            return ctx.reply("Failed to retrieve search results.");
        }

        console.log("Search Results: ", data);

        let html = "";

        if (outputFormat === "html") {
            html = data.reduce((acc, curr) => {
                return (
                    acc +
                    `
            <div>
                <h3>${curr.title}</h3>
                <a href="${curr.link}">${curr.link}</a>
                <p>${curr.snippet}</p>
            </div>
        `
                );
            }, "");
        } else {
            // markdown
            html = data.reduce((acc, curr) => {
                return (
                    acc +
                    `
            *${curr.title}*
            [${curr.link}](${curr.link})
            ${curr.snippet || ""}
        `
                );
            });
        }

        try {
            // Get current html and structured data with antropic
            console.log("Scrapper formatting prompt: ", html);
            const completion = await this.openai.chat.completions.create({
                model: "gpt-4o",
                temperature: 0.5,
                max_tokens: 3000,
                messages: [
                    {
                        content: `
                        You are tasked with generating a response based on the search results from a given query. The goal is to summarize the key information and insights from the search results in a clear and concise manner.
                        1. Review the search results and identify the most relevant and important information.
                        2. Summarize the key points and insights from the search results.
                        3. Provide a brief overview of the main topics and themes covered in the search results.
                        3. Use simple, straightforward language that is easy to understand.
                        4. Avoid repeating information or including unnecessary details.
                        5. Keep the response concise and focused on the main points.
                        7. Attach links to the original sources of information under each point.
                    `,
                        role: "system",
                    },
                    {
                        role: "user",
                        content: html,
                    },
                ],
            });

            const messages = completion.choices[0].message.content;
            if (messages) {
                html = messages;
            }

            if (this.telegramBot) {
                this.telegramBot.telegram.sendMessage(ctx.chat.id, html, {
                    parse_mode: "Markdown",
                });
            } else {
                ctx.replyWithHTML(html);
            }
        } catch (error) {
            console.error("Failed to generate response:", error);
            ctx.reply(html);
        }

        this.activeSearches = this.activeSearches.filter(id => id !== ctx.from.id);

        return html;
    }

    /**
     * @param {import("telegraf").Context} ctx
     * @returns {Promise<string>}
     * @description Handles scrapper action
     */
    async handleScrapperRecursive(ctx) {
        const initMessage = await ctx.reply("Loading...");

        const activeSearches = this.activeSearches.length;
        const userId = ctx.from.id;

        try {
            const db = await databaseManager.getDatabase();

            const { data } = await db
                .from("interactions")
                .select("*")
                .eq("action_name", "scrapperrecursive")
                .eq("user_id", userId)
                .single();

            const commandCount = data?.count;

            const { data: dataUpdate, error } = await db
                .from("interactions")
                .upsert({
                    user_id: userId,
                    count: (commandCount || 1) + 1,
                    action_name: "scrapperrecursive",
                })
                .eq("user_id", userId);

            console.log("Update interaction: ", dataUpdate, error);
        } catch (err) {
            console.log(err);
        }

        console.log("Active searches:", activeSearches);

        if (activeSearches >= this.maxActiveSearches) {
            return ctx.reply(`Too many active searches. Please wait.`);
        }

        this.activeSearches.push(ctx.from.id);

        let prompt = ctx.message.text;

        if (!prompt) {
            return ctx.reply("No search query provided.");
        }

        console.log("Search query:", prompt);

        let data;
        try {
            data = await this.searchEngine.search(prompt, "duckduckgo", true);

            data = data.organic_results.map((r, i) => {
                return {
                    ...r,
                    inner_page_results: data.inner_page_results[i],
                };
            });

            console.log("Search Raw Response: ", data);
        } catch (error) {
            console.error("Failed to fetch search results:", error);
        }

        if (!data || !data.length) {
            return ctx.reply("Failed to retrieve search results.");
        }

        console.log("Search Results: ", data);

        let html = "";

        try {
            const userInput = data
                .map(d => {
                    return `
                title: ${d.title}
                link: ${d.link}
                snippet: ${d.snippet}
                ${d?.inner_page_results ? `inner page content:  ${d.inner_page_results}` : ""}
                `;
                })
                .join(", ");

            console.log("Prepared prompt for formatting: ", userInput);
            // Get current html and structured data with antropic
            const completion = await this.openai.chat.completions.create({
                model: "gpt-4o",
                temperature: 0,
                max_tokens: 16384,
                messages: [
                    {
                        content: `
                            You are tasked with generating a response based on the search results from a given query. The goal is to summarize the key information and insights from the search results in a clear and concise manner.
                            1. Review the search results and identify the most relevant and important information.
                            2. Summarize the key points and insights from the search results.
                            3. Provide a brief overview of the main topics and themes covered in the search results.
                            3. Use simple, straightforward language that is easy to understand.
                            4. Avoid repeating information or including unnecessary details.
                            5. Keep the response concise and focused on the main points.
                            7. Attach links to the original sources of information under each point.
                            8. Ignore not related to search query information: <searchQuery>${prompt}</searchQuery>
                        `,
                        role: "system",
                    },
                    {
                        role: "user",
                        content: userInput,
                    },
                ],
            });

            updateTokensTracking(
                ctx,
                {
                    usage: {
                        input_tokens: completion.usage?.prompt_tokens,
                        output_tokens: completion.usage?.completion_tokens,
                    },
                },
                "scrapper"
            );

            const messages = completion.choices[0].message.content;

            if (messages) {
                html = messages;
            }

            if (this.telegramBot) {
                this.telegramBot.telegram.sendMessage(ctx.chat.id, html, {
                    parse_mode: "Markdown",
                });
            } else {
                ctx.replyWithHTML(html);
            }
        } catch (error) {
            console.error("Failed to generate response:", error);
            ctx.reply(html);
        }

        try {
            if (this.telegramBot)
                await this.telegramBot.telegram.deleteMessage(ctx.chat.id, initMessage.message_id);
        } catch (err) {
            console.log(err);
        }

        this.activeSearches = this.activeSearches.filter(id => id !== ctx.from.id);

        return html;
    }
}

export default ScrapperHandler;

class SearchEngine {
    constructor() {
        this.engines = new Map();
        this.browser = null;
        this.initializeEngines();
    }

    initializeEngines() {
        this.engines.set("duckduckgo", this.scrapeDuckDuckGo.bind(this));
        this.engines.set("google", this.scrapeGoogle.bind(this));
        this.engines.set("bing", this.scrapeBing.bind(this));
    }

    async scrapePageContent(url, timeout = 10000) {
        let page;
        try {
            page = await this.getPage();
            page.setDefaultNavigationTimeout(timeout);

            // Enhanced request interception
            await page.setRequestInterception(true);
            page.on("request", request => {
                const resourceType = request.resourceType();
                if (["image", "stylesheet", "font", "media", "script"].includes(resourceType)) {
                    request.abort();
                } else {
                    request.continue();
                }
            });

            await Promise.race([
                page.goto(url, { waitUntil: "domcontentloaded" }),
                new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), timeout)),
            ]);

            // Enhanced content extraction with better filtering
            const content = await page.evaluate(() => {
                function getTextDensity(element) {
                    const text = element.textContent;
                    const htmlLength = element.innerHTML.length;
                    return text.length / htmlLength;
                }

                function cleanText(text) {
                    return (
                        text
                            // Remove scripts and style tags content
                            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
                            .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
                            // Remove HTML tags
                            .replace(/<[^>]+>/g, " ")
                            // Remove special characters and normalize spaces
                            .replace(/&[a-z]+;/gi, " ")
                            // Remove URLs
                            .replace(/https?:\/\/\S+/g, "")
                            // Remove email addresses
                            .replace(/[\w\.-]+@[\w\.-]+\.\w+/g, "")
                            // Remove extra whitespace
                            .replace(/\s+/g, " ")
                            // Remove common UI elements text
                            .replace(
                                /^(Menu|Navigation|Search|Skip to content|Close|Open|Toggle|Share|Follow)$/gim,
                                ""
                            )
                            .trim()
                    );
                }

                function getMainContent() {
                    const contentSelectors = [
                        "article",
                        '[role="main"]',
                        ".post-content",
                        ".article-content",
                        ".entry-content",
                        "#content",
                        ".content",
                        "main",
                    ];

                    let bestElement = null;
                    let maxScore = 0;

                    function scoreElement(element) {
                        // Ignore hidden elements
                        if (
                            window.getComputedStyle(element).display === "none" ||
                            window.getComputedStyle(element).visibility === "hidden"
                        ) {
                            return 0;
                        }

                        const textDensity = getTextDensity(element);
                        const paragraphs = element.getElementsByTagName("p").length;
                        const words = element.textContent.split(/\s+/).length;
                        const hasUnwantedClass = element.className.match(
                            /(comment|sidebar|footer|header|menu|nav|social|share|related|ad|widget)/i
                        );

                        // Penalize elements with unwanted classes
                        const classScore = hasUnwantedClass ? -0.5 : 0;

                        // Enhanced scoring system
                        return (
                            textDensity * 0.3 +
                            (paragraphs / 10) * 0.3 +
                            (words / 500) * 0.3 +
                            classScore +
                            (element.tagName === "ARTICLE" ? 0.2 : 0)
                        );
                    }

                    // Try content selectors first
                    for (const selector of contentSelectors) {
                        const elements = document.querySelectorAll(selector);
                        for (const element of elements) {
                            const score = scoreElement(element);
                            if (score > maxScore) {
                                maxScore = score;
                                bestElement = element;
                            }
                        }
                    }

                    // Fallback to analyzing all major elements
                    if (!bestElement || maxScore < 0.5) {
                        document.querySelectorAll("div, section").forEach(element => {
                            const score = scoreElement(element);
                            if (score > maxScore) {
                                maxScore = score;
                                bestElement = element;
                            }
                        });
                    }

                    // Get content and clean it
                    if (bestElement) {
                        // Remove unwanted elements before getting content
                        const unwantedSelectors = [
                            "script",
                            "style",
                            "iframe",
                            "form",
                            '[class*="comment"]',
                            '[class*="social"]',
                            '[class*="share"]',
                            '[class*="related"]',
                            "nav",
                            "header",
                            "footer",
                        ];

                        const clonedElement = bestElement.cloneNode(true);
                        unwantedSelectors.forEach(selector => {
                            clonedElement.querySelectorAll(selector).forEach(el => el.remove());
                        });

                        return cleanText(clonedElement.textContent);
                    }
                    return "";
                }

                const content = getMainContent();
                return content.slice(0, 5000); // Limit content length
            });

            return content;
        } catch (error) {
            console.error(`Error scraping ${url}:`, error);
            return "";
        } finally {
            if (page) await page.close().catch(console.error);
        }
    }

    async initializeBrowser() {
        if (!this.browser) {
            this.browser = await puppeteer.launch({
                headless: "new",

                args: [
                    "--no-sandbox",
                    "--disable-setuid-sandbox",
                    "--disable-dev-shm-usage",
                    "--disable-gpu",
                    "--window-size=1920,1080",
                    "--disable-web-security",
                    "--disable-features=IsolateOrigins,site-per-process",
                ],
                defaultViewport: {
                    width: 1920,
                    height: 1080,
                },

                timeout: 60000,

                ignoreHTTPSErrors: true,
            });
        }
        return this.browser;
    }

    async closeBrowser() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }

    async getPage() {
        const browser = await this.initializeBrowser();
        const page = await browser.newPage();
        await page.setUserAgent(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        );
        return page;
    }

    async search(query, engine = "duckduckgo", deep = false) {
        const searchFunction = this.engines.get(engine.toLowerCase());
        if (!searchFunction) {
            throw new Error(`Search engine '${engine}' not supported`);
        }
        return await searchFunction(query, deep);
    }

    async scrapeDuckDuckGo(searchQuery, deep = false) {
        let page;
        try {
            page = await this.getPage();
            await page.goto("https://www.duckduckgo.com", {
                waitUntil: "networkidle0",
                timeout: 30000,
            });

            await page.type("#searchbox_input", searchQuery);
            await Promise.all([
                page.keyboard.press("Enter"),
                page.waitForNavigation({ waitUntil: "networkidle0" }),
            ]);

            const resultsSelector = "[data-testid='result']";
            await page.waitForSelector(resultsSelector, { timeout: 5000 });

            const searchResults = await page.evaluate(() => {
                const results = Array.from(document.querySelectorAll("[data-testid='result']"));
                return results.map(result => ({
                    title: result
                        .querySelector("[data-testid='result-title-a'")
                        ?.textContent?.trim(),
                    link: result.querySelector("[data-testid='result-extras-url-link']")?.href,
                    snippet: result.querySelector("[data-result='snippet']")?.textContent?.trim(),
                }));
            });

            const inner_page_results = [];

            if (deep) {
                // Process URLs in parallel with limits
                const CONCURRENT_SCRAPES = 3;
                const TIMEOUT_PER_PAGE = 10000;

                const chunks = [];
                for (let i = 0; i < searchResults.length; i += CONCURRENT_SCRAPES) {
                    chunks.push(searchResults.slice(i, i + CONCURRENT_SCRAPES));
                }

                for (const chunk of chunks) {
                    const promises = chunk.map(async (result, index) => {
                        const link = result.link;
                        if (!link || !link.startsWith("http")) return "";

                        try {
                            const content = await this.scrapePageContent(link, TIMEOUT_PER_PAGE);
                            return content;
                        } catch (error) {
                            console.error(`Failed to scrape ${link}:`, error);
                            return "";
                        }
                    });

                    const results = await Promise.all(promises);
                    inner_page_results.push(...results);
                }
            }

            return {
                success: true,
                engine: "duckduckgo",
                organic_results: searchResults,
                result_count: searchResults.length,
                inner_page_results,
            };
        } catch (error) {
            return {
                success: false,
                engine: "duckduckgo",
                error: error.message,
                organic_results: [],
                result_count: 0,
            };
        } finally {
            if (page) await page.close().catch(console.error);
        }
    }

    async scrapeGoogle(searchQuery, deep = false) {
        let page;
        try {
            page = await this.getPage();
            await page.goto(`https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`, {
                waitUntil: "networkidle0",
            });

            const searchResults = await page.evaluate(() => {
                const results = Array.from(document.querySelectorAll(".g"));
                return results.map(result => ({
                    title: result.querySelector("h3")?.textContent,
                    link: result.querySelector("a")?.href,
                    snippet: result.querySelector(".VwiC3b")?.textContent,
                }));
            });

            const inner_page_results = [];

            if (deep) {
                // Process URLs in parallel with limits
                const CONCURRENT_SCRAPES = 3;
                const TIMEOUT_PER_PAGE = 10000;

                const chunks = [];
                for (let i = 0; i < searchResults.length; i += CONCURRENT_SCRAPES) {
                    chunks.push(searchResults.slice(i, i + CONCURRENT_SCRAPES));
                }

                for (const chunk of chunks) {
                    const promises = chunk.map(async (result, index) => {
                        const link = result.link;
                        if (!link || !link.startsWith("http")) return "";

                        try {
                            const content = await this.scrapePageContent(link, TIMEOUT_PER_PAGE);
                            return content;
                        } catch (error) {
                            console.error(`Failed to scrape ${link}:`, error);
                            return "";
                        }
                    });

                    const results = await Promise.all(promises);
                    inner_page_results.push(...results);
                }
            }

            return {
                success: true,
                engine: "google",
                organic_results: searchResults,
                result_count: searchResults.length,
                inner_page_results,
            };
        } catch (error) {
            return {
                success: false,
                engine: "google",
                error: error.message,
                organic_results: [],
                result_count: 0,
            };
        } finally {
            if (page) await page.close().catch(console.error);
        }
    }

    async scrapeBing(searchQuery) {
        let page;
        try {
            page = await this.getPage();
            await page.goto(`https://www.bing.com/search?q=${encodeURIComponent(searchQuery)}`, {
                waitUntil: "networkidle0",
            });

            const searchResults = await page.evaluate(() => {
                const results = Array.from(document.querySelectorAll(".b_algo"));
                return results.map(result => ({
                    title: result.querySelector("h2")?.textContent,
                    link: result.querySelector("a")?.href,
                    snippet: result.querySelector(".b_caption p")?.textContent,
                }));
            });

            return {
                success: true,
                engine: "bing",
                organic_results: searchResults,
                result_count: searchResults.length,
            };
        } catch (error) {
            return {
                success: false,
                engine: "bing",
                error: error.message,
                organic_results: [],
                result_count: 0,
            };
        } finally {
            if (page) await page.close().catch(console.error);
        }
    }
}
