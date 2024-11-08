import test from "node:test";
import sqlite3 from "sqlite3";
import { promisify } from "util";
import assert from "node:assert";
import { DB_CREATION_QUERY } from "./db.js";

import { Telegraf } from "telegraf";
import Anthropic from "@anthropic-ai/sdk";
import { configDotenv } from "dotenv";

configDotenv();

sqlite3.verbose();

test("insertHistory inserts a record into the history table", async t => {
    const { insertHistory } = await import("./db.js");

    const db = new sqlite3.Database(":memory:");

    // Promisify database operations
    const run = promisify(db.run.bind(db));
    const get = promisify(db.get.bind(db));

    await run(DB_CREATION_QUERY);

    const id = Math.floor(Math.random() * 1000);

    insertHistory(
        {
            userInput: "Hello",
            botResponse: "Hi",
            userId: id,
        },
        db
    ); // Pass db instance to insertHistory

    const row = await get("SELECT * FROM history WHERE user_id = ?", id);

    assert.ok(row, "Row should exist in the database");
    assert.equal(row.user_input, "Hello", "User input should match");
    assert.equal(row.bot_response, "Hi", "Bot response should match");
    assert.equal(row.user_id, id, "User ID should match");

    // delete the record
    await run("DELETE FROM history WHERE user_id = ?", id);

    await new Promise(resolve => db.close(resolve));
});

test("Reddit API", async t => {
    const url = process.env.REDDIT_API_URL;

    await t.test("Reddit API should be reachable", async t => {
        let attempts = 0;
        let response;
        while (attempts < 5) {
            response = await fetch(url);
            if (response.ok) break;
            attempts++;
        }
        assert.ok(response.ok, "API should be reachable after 5 attempts");
    });
});

test("Telegram Bot", async t => {
    await t.test("Bot should have valid token", async t => {
        // Create bot instance with mocked methods
        const bot = new Telegraf(process.env.BOT_TOKEN);
        assert.ok(bot.token, "Bot should have a token");
    });

    await t.test("AI integration", async t => {
        await t.test("should process AI response correctly", async t => {
            const anthropic = new Anthropic({
                apiKey: process.env.ANTHROPIC_API_KEY,
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

            assert.ok(response, "Response should exist");
            assert.ok(response.content[0].text, "Response data should exist");
        });
    });
});
