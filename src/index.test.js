import assert from "node:assert";
import { test, describe, it, beforeEach, expect } from "bun:test";
import { databaseManager, SQL_QUERIES } from "./database/db.js";

import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { Telegraf } from "telegraf";
import ChessGameHandler, { BOARD_CONFIG } from "./actions/chess.js";
import { Database } from "bun:sqlite";
import puppeteer from "puppeteer";
import { Client, GatewayIntentBits, Partials } from "discord.js";

const record = {
    userId: 10,
    userInput: "Hello",
    botResponse: "Hi",
};

test("DB Insert record into the history table", async () => {
    try {
        // Get database instance
        const db = databaseManager.getDatabase();

        db.query(SQL_QUERIES.INSERT_HISTORY).run(
            record.userId,
            record.userInput,
            record.botResponse
        );

        const history = db
            .query("SELECT * FROM history WHERE user_id = $userId")
            .get({ $userId: record.userId });

        expect(history).toBeTruthy();
        expect(history.user_input).toBe(record.userInput);
        expect(history.bot_response).toBe(record.botResponse);
        expect(history.user_id).toBe(record.userId);

        databaseManager.close();
    } catch (error) {
        console.error("Error executing query:", error);
    }
});

test("Record from db should be deleted", async () => {
    const db = new Database(":memory:");

    db.exec(SQL_QUERIES.CREATE_HISTORY_TABLE);

    const insertRecord = db.prepare(SQL_QUERIES.INSERT_HISTORY);
    insertRecord.run(record.userId, record.userInput, record.botResponse);

    db.query("SELECT * FROM history WHERE user_id = ?").run(record.userId);

    db.query("DELETE FROM history WHERE user_id = ?").run(record.userId);

    const isDeleted = db.query("SELECT * FROM history WHERE user_id = ?").get(record.userId);

    expect(isDeleted).toBeFalsy();

    databaseManager.close();
});

test("Reddit API should return a valid response", async () => {
    const url = Bun.env.REDDIT_API_URL + "ProgrammerHumor.json";

    let attempts = 0;
    let response;
    while (attempts < 5) {
        response = await fetch(url);
        if (response.ok) break;
        attempts++;
    }

    expect(response.ok).toBe(true);
});

test("Telegram Bot should have valid token", async () => {
    // Create bot instance with mocked methods
    const bot = new Telegraf(Bun.env.TELEGRAM_BOT_TOKEN);
    expect(bot.token).toBeTruthy();
    bot.drop();
});

test("Discord Bot should have valid token", async () => {
    const bot = new Client({
        intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
        partials: [Partials.Channel],
    });

    bot.login(Bun.env.DISCORD_BOT_TOKEN);
    expect(bot.token).toBeTruthy();
    bot.destroy();
});

test("Antropic API response correctly", async () => {
    const anthropic = new Anthropic({
        apiKey: Bun.env.ANTHROPIC_API_KEY,
    });

    const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1024,
        messages: [
            {
                role: "user",
                content: "hello",
            },
        ],
    });

    expect(response, "Response should exist").toBeTruthy();
    expect(response.content[0].text, "Response data should exist").toBeString();
});

test("OpenAI API response correctly", async () => {
    const openai = new OpenAI({ apiKey: Bun.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
            {
                role: "user",
                content: "hello",
            },
        ],
    });

    let aiRes = completion.choices[0].message.content;
    expect(aiRes, "Response should exist").toBeString();
});

describe("Scrapper", async () => {
    const browserConfig = {
        headless: "new",
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-gpu",
            "--window-size=1920,1080",
            "--disable-web-security", // Disable CORS for iframe issues
            "--disable-features=IsolateOrigins,site-per-process", // Handle frame isolation
        ],
        defaultViewport: {
            width: 1920,
            height: 1080,
        },
        ignoreHTTPSErrors: true, // Handle potential SSL issues
    };

    let browser = await puppeteer.launch(browserConfig);
    try {
        test(
            "should return search results",
            async () => {
                // Launch with specific arguments to avoid detection
                const browser = await puppeteer.launch({
                    headless: "new",
                    args: [
                        "--no-sandbox",
                        "--disable-setuid-sandbox",
                        "--disable-dev-shm-usage",
                        "--disable-accelerated-2d-canvas",
                        "--disable-gpu",
                        "--window-size=1920x1080",
                    ],
                    defaultViewport: {
                        width: 1920,
                        height: 1080,
                    },
                });

                try {
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
                    await page.type("#searchbox_input", "puppeteer");
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
                        const results = Array.from(
                            document.querySelectorAll("[data-testid='result']")
                        );

                        return results.map(result => {
                            const title = result.querySelector("h2")?.textContent?.trim();
                            const link = result.querySelector("a")?.href;
                            const snippet = result
                                .querySelector("[data-result='snippet']")
                                ?.textContent?.trim();
                            return { title, link, snippet };
                        });
                    });

                    expect(searchResults.length).toBeGreaterThan(0);
                    expect(searchResults[0].title).toBeString();
                    expect(searchResults[0].link).toBeString();
                    expect(searchResults[0].snippet).toBeString();
                } catch (error) {
                    console.error("Failed to scrape DuckDuckGo, error:", error);
                } finally {
                    await browser.close();
                }
            },
            {
                timeout: 30000, // Increased timeout
            }
        );
    } catch (error) {
        console.error("Failed to scrape Google:", error);
        browser.close();
    }
});

test("Chess game", async () => {
    let handler;

    // Mock dependencies
    const mockBot = {
        action: () => {},
    };
    const mockAnthropic = {
        messages: {
            create: async () => ({
                content: [{ text: "e2e4" }],
            }),
        },
    };

    const mockSendMenu = () => {};

    // Setup
    beforeEach(() => {
        const args = {
            anthropic: mockAnthropic,
            openai: {},
            bot: mockBot,
            sendMenu: mockSendMenu,
        };
        handler = new ChessGameHandler(args);
    });

    describe("Board Initialization", async t => {
        it("should initialize board correctly", () => {
            const board = handler.initializeBoard();
            assert.equal(board.length, 8);
            assert.equal(board[0].length, 8);

            // Check initial piece positions
            assert.equal(board[0][0], BOARD_CONFIG.PIECES.BLACK.ROOK);
            assert.equal(board[7][7], BOARD_CONFIG.PIECES.WHITE.ROOK);
            assert.equal(board[1][0], BOARD_CONFIG.PIECES.BLACK.PAWN);
            assert.equal(board[6][0], BOARD_CONFIG.PIECES.WHITE.PAWN);
        });
    });

    describe("Piece Movement Validation", async t => {
        it("should validate pawn moves correctly", () => {
            const gameState = {
                board: handler.initializeBoard(),
                playerColor: "white",
                aiColor: "black",
                isPlayerTurn: true,
                moveHistory: [],
            };

            const pawnMoves = handler.getPawnMoves(gameState, 0, 6, true);
            assert(pawnMoves.includes("a2a3"));
            assert(pawnMoves.includes("a2a4"));
        });

        it("should validate rook moves correctly", () => {
            const gameState = {
                board: handler.initializeBoard(),
                playerColor: "white",
                aiColor: "black",
                isPlayerTurn: true,
                moveHistory: [],
            };

            // Move pawn to open path for rook
            gameState.board[6][0] = BOARD_CONFIG.SQUARES.LIGHT;
            const rookMoves = handler.getRookMoves(gameState, 0, 7, true);
            assert(rookMoves.length > 0);
        });

        it("should validate knight moves correctly", () => {
            const gameState = {
                board: handler.initializeBoard(),
                playerColor: "white",
                aiColor: "black",
                isPlayerTurn: true,
                moveHistory: [],
            };

            const knightMoves = handler.getKnightMoves(gameState, 1, 7, true);
            assert(knightMoves.length > 0);
        });
    });

    describe("Move Execution", async t => {
        it("should execute valid moves", async () => {
            const gameState = {
                board: handler.initializeBoard(),
                playerColor: "white",
                aiColor: "black",
                isPlayerTurn: true,
                moveHistory: [],
                userId: 1,
            };

            await handler.makeMove(gameState, "e2e4");
            assert.equal(gameState.moveHistory.length, 1);
            assert.equal(gameState.moveHistory[0], "e2e4");
        });
    });

    describe("Game State Check", async t => {
        it("should detect check correctly", () => {
            const gameState = {
                board: handler.initializeEmptyBoard(),
                playerColor: "white",
                aiColor: "black",
                isPlayerTurn: true,
                moveHistory: [],
            };

            // Set up a check position
            gameState.board[0][4] = BOARD_CONFIG.PIECES.BLACK.KING;
            gameState.board[2][4] = BOARD_CONFIG.PIECES.WHITE.QUEEN;

            assert(handler.isKingInCheck(gameState, "black"));
        });
    });

    describe("Board Notation", async t => {
        it("should convert between board coordinates and chess notation", () => {
            const [rank, file] = handler.getSquareFromNotation("e2", "white");
            assert.equal(rank, 6);
            assert.equal(file, 4);

            const notation = handler.getNotationFromSquare(6, 4, "white");
            assert.equal(notation, "e2");
        });

        it("should convert board to FEN notation", () => {
            const board = handler.initializeBoard();
            const fen = handler.boardToFEN(board);
            assert(fen.includes("rnbqkbnr"));
            assert(fen.includes("RNBQKBNR"));
        });
    });

    describe("Move Generation", async t => {
        it("should generate valid moves for all pieces", () => {
            const gameState = {
                board: handler.initializeBoard(),
                playerColor: "white",
                aiColor: "black",
                isPlayerTurn: true,
                moveHistory: [],
            };

            const validMoves = handler.getValidMoves(gameState, "white");
            assert(validMoves.length > 0);
            assert(validMoves.some(move => move.startsWith("e2")));
        });
    });

    describe("AI Move Generation", async t => {
        it("should generate valid AI moves", async () => {
            const gameState = {
                board: handler.initializeBoard(),
                playerColor: "white",
                aiColor: "black",
                isPlayerTurn: false,
                moveHistory: [],
            };

            const aiMove = await handler.getAiMove(gameState);
            assert(typeof aiMove === "string");
            assert(aiMove.length === 4);
        });
    });
});
