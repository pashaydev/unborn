import assert from "node:assert";
import test, { describe, it } from "node:test";
import sqlite3 from "sqlite3";
import { promisify } from "util";
import { DB_CREATION_QUERY } from "./db.js";

import Anthropic from "@anthropic-ai/sdk";
import { configDotenv } from "dotenv";
import OpenAI from "openai";
import { Telegraf } from "telegraf";
import ChessGameHandler, { BOARD_CONFIG } from "./actions/chess.js";

configDotenv();

sqlite3.verbose();

test("insertHistory inserts a record into the history table", async (t) => {
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
    db,
  ); // Pass db instance to insertHistory

  const row = await get("SELECT * FROM history WHERE user_id = ?", id);

  assert.ok(row, "Row should exist in the database");
  assert.equal(row.user_input, "Hello", "User input should match");
  assert.equal(row.bot_response, "Hi", "Bot response should match");
  assert.equal(row.user_id, id, "User ID should match");

  // delete the record
  await run("DELETE FROM history WHERE user_id = ?", id);

  await new Promise((resolve) => db.close(resolve));
});

test("Reddit API", async (t) => {
  const url = process.env.REDDIT_API_URL;

  await t.test("Reddit API should be reachable", async (t) => {
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

test("Telegram Bot", async (t) => {
  await t.test("Bot should have valid token", async (t) => {
    // Create bot instance with mocked methods
    const bot = new Telegraf(process.env.BOT_TOKEN);
    assert.ok(bot.token, "Bot should have a token");
  });

  await t.test("AI integration", async (t) => {
    await t.test(
      "should process Antropic API response correctly",
      async (t) => {
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
      },
    );
  });

  await t.test("should process OpenAI API correctly", async (t) => {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
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
    assert.ok(aiRes, "Response should exist");
  });
});

test("Chess game", async (t) => {
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
  t.beforeEach(() => {
    handler = new ChessGameHandler(mockBot, mockAnthropic, mockSendMenu);
  });

  await describe("Board Initialization", async (t) => {
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

  await describe("Piece Movement Validation", async (t) => {
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
  });

  await describe("Move Execution", async (t) => {
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

  await describe("Game State Check", async (t) => {
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

  await describe("Board Notation", async (t) => {
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

  await describe("Move Generation", async (t) => {
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
      assert(validMoves.some((move) => move.startsWith("e2")));
    });
  });

  await describe("AI Move Generation", async (t) => {
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
