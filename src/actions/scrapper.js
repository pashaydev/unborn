import fetch from "node-fetch";
import Bun from "bun";
import puppeteer from "puppeteer";

class ScrapperHandler {
    /**
     * @param {import("telegraf").Telegraf} bot
     * @param {import("@anthropic-ai/sdk").Anthropic} anthropic
     * @param {Function} sendMenu
     * @param {import("openai").OpenAI} openai
     */
    constructor(args) {
        this.bot = args.bot;
        this.anthropic = args.anthropic;
        this.sendMenu = args.sendMenu;
        this.openai = args.openai;
        this.activeSearches = [];
        this.maxActiveSearches = 2;
    }

    initCommand(ctx, actionName) {
        ctx.reply("Please provide a search query.");
    }
    initAction(ctx, actionName) {
        ctx.reply("Please provide a search query.");
    }
    handleTextMessage(ctx, actionName) {
        this.handleScrapper(ctx, actionName);
    }

    /**
     * @param {import("telegraf").Context} ctx
     * @returns {Promise<void>}
     * @description Handles scrapper action
     */
    async handleScrapper(ctx) {
        ctx.reply("scrapping web...");

        const activeSearches = this.activeSearches.length;

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
        const data = await scrapeDuckDuckGo(prompt);

        if (!data) {
            return ctx.reply("Failed to scrap data.");
        }

        console.log("Search Results:");
        console.log(JSON.stringify(data, null, 2));

        const { organic_results } = data;

        if (!organic_results || !organic_results.length) {
            return ctx.reply("No results found.");
        }

        let html = ``;

        for (const result of organic_results) {
            html += `<b>${result.title}</b>\n${result.snippet}\n\n`;
            html += `<pre>${result.link}</pre>\n\n`;
        }

        try {
            // Get current html and structured data with antropic
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
                            6. Return the response in html format, use only these tags:
                                - <b>, <strong> for bold text
                                - <i>, <em> for italic text
                                - <code>, for inline code
                                - <s>, <strike>, <del> for strikethrough text
                                - <u> for underline text
                                - <pre> for preformatted text
                                Do not use any other tags.
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

            ctx.replyWithHTML(html);
        } catch (error) {
            console.error("Failed to generate response:", error);
            ctx.reply(html);
        }

        this.activeSearches = this.activeSearches.filter(id => id !== ctx.from.id);
    }

    /**
     * @param {string} prompt
     * @returns {Promise<SearchResult>}
     */
    async getScrapperData(prompt) {
        try {
            const url = `https://api.scraperapi.com/structured/google/search?api_key=${Bun.env.SCRAPPER_API_KEY}&query=${prompt}`;
            console.log("Fetching scrapper data:", url);
            /**
             * @type {SearchResult}
             */
            const response = await fetch(url);

            if (!response.ok) {
                console.error("Failed to fetch scrapper data:", response.statusText);
                return null;
            }

            return response.json();
        } catch (error) {
            console.error("Failed to fetch scrapper data:", error);
            return null;
        }
    }
}

export default ScrapperHandler;

async function scrapeDuckDuckGo(searchQuery) {
    let browser;
    try {
        browser = await puppeteer.launch({
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
            ignoreHTTPSErrors: true,
        });

        const page = await browser.newPage();

        // Set a realistic user agent
        await page.setUserAgent(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        );

        // Consider using a different search engine that's more automation-friendly
        await page.goto("https://www.duckduckgo.com", {
            waitUntil: "networkidle0",
            timeout: 30000,
        });

        // Add error handling for navigation
        await page.type("#searchbox_input", searchQuery);
        await Promise.all([
            page.keyboard.press("Enter"),
            page.waitForNavigation({ waitUntil: "networkidle0" }),
        ]);

        // Wait for results with timeout and error handling
        const resultsSelector = "[data-testid='result']";
        await page.waitForSelector(resultsSelector, { timeout: 5000 }).catch(e => {
            throw new Error(`Results not found: ${e.message}`);
        });

        const searchResults = await page.evaluate(() => {
            // find elements with data-testid attribute
            const results = Array.from(document.querySelectorAll("[data-testid='result']"));

            return results.map(result => {
                const title = result
                    .querySelector("[data-testid='result-title-a'")
                    ?.textContent?.trim();
                const link = result.querySelector("[data-testid='result-extras-url-link']")?.href;
                const snippet = result
                    .querySelector("[data-result='snippet']")
                    ?.textContent?.trim();
                return { title, link, snippet };
            });
        });

        return {
            success: true,
            organic_results: searchResults,
            result_count: searchResults.length,
        };
    } catch (error) {
        console.error("Scraping failed:", error.message);
        return {
            success: false,
            error: error.message,
            organic_results: [],
            result_count: 0,
        };
    } finally {
        if (browser) {
            try {
                await browser.close();
            } catch (error) {
                console.error("Error closing browser:", error.message);
            }
        }
    }
}
