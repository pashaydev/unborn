import fetch from "node-fetch";
import Bun from "bun";
import puppeteer from "puppeteer";

class ScrapperHandler {
    /**
     * @param {import("telegraf").Telegraf} bot
     * @param {import("@anthropic-ai/sdk").Anthropic} anthropic
     * @param {Function} sendMenu
     * @param {import("openai").OpenAI} openai
     * @param {number} maxActiveSearches
     * @param {SearchEngine} searchEngine
     */
    constructor(args) {
        this.bot = args.bot;
        this.anthropic = args.anthropic;
        this.sendMenu = args.sendMenu;
        this.openai = args.openai;
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

        // Try DuckDuckGo first, fallback to Google if it fails
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

        let html = data.reduce((acc, curr) => {
            return (
                acc + `\n\n<b>${curr.title}</b>\n<pre>${curr.link}</pre>\n<i>${curr.snippet}</i>`
            );
        }, "");

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

    async search(query, engine = "duckduckgo") {
        const searchFunction = this.engines.get(engine.toLowerCase());
        if (!searchFunction) {
            throw new Error(`Search engine '${engine}' not supported`);
        }
        return await searchFunction(query);
    }

    async scrapeDuckDuckGo(searchQuery) {
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

            return {
                success: true,
                engine: "duckduckgo",
                organic_results: searchResults,
                result_count: searchResults.length,
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

    async scrapeGoogle(searchQuery) {
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

            return {
                success: true,
                engine: "google",
                organic_results: searchResults,
                result_count: searchResults.length,
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
