import { Markup } from "telegraf";
import Anthropic from "@anthropic-ai/sdk";
import { saveHistory } from "../db.js";
import { message } from "telegraf/filters";

export const BOARD_CONFIG = {
    FILES: "abcdefgh",
    RANKS: "12345678",
    SQUARES: {
        DARK: "x",
        LIGHT: "o",
    },
    PIECES: {
        WHITE: {
            KING: "♔",
            QUEEN: "♕",
            ROOK: "♖",
            BISHOP: "♗",
            KNIGHT: "♘",
            PAWN: "♙",
        },
        BLACK: {
            KING: "♚",
            QUEEN: "♛",
            ROOK: "♜",
            BISHOP: "♝",
            KNIGHT: "♞",
            PAWN: "♟",
        },
    },
};

const FILES = BOARD_CONFIG.FILES;
const RANKS = BOARD_CONFIG.RANKS;

export default class ChessGameHandler {
    /**
     * @param {import('telegraf').Telegraf} bot
     * @param {Anthropic} anthropic
     * @param {Function} sendMenu
     */
    constructor(bot, anthropic, sendMenu) {
        this.bot = bot;
        this.anthropic = anthropic;
        this.sendMenu = sendMenu;
        this.games = new Map();
        this.setupBotActions();
    }

    setupBotActions() {
        this.bot.action("chess", ctx => this.startNewGame(ctx));
    }

    async handleTextCommand(ctx) {
        const gameState = this.games.get(ctx.chat.id);

        const isPlayerTurn = gameState.isPlayerTurn;
        if (!isPlayerTurn) {
            return await ctx.reply("Is not your turn!");
        }
        const text = ctx.message.text;
        const validMoves = this.getValidMoves(gameState, gameState.playerColor);
        const commandValid = validMoves.some(m => m === text.trim());
        if (commandValid) {
            await this.executeMove(gameState, text, ctx);
            await this.handleAIResponse(gameState, ctx);
        } else {
            await ctx.reply(
                `${this.parseMoveToReadable(
                    text,
                    gameState,
                    gameState.playerColor
                )}, is not valid move!`
            );
        }
    }

    initializeEmptyBoard() {
        const board = Array(8)
            .fill()
            .map((_, rankIndex) => {
                return Array(8)
                    .fill()
                    .map((_, fileIndex) =>
                        (rankIndex + fileIndex) % 2 === 0
                            ? BOARD_CONFIG.SQUARES.LIGHT
                            : BOARD_CONFIG.SQUARES.DARK
                    );
            });
        return board;
    }

    initializeBoard() {
        const { WHITE, BLACK } = BOARD_CONFIG.PIECES;
        const board = Array(8)
            .fill()
            .map((_, rankIndex) => {
                if (rankIndex === 0)
                    return [
                        BLACK.ROOK,
                        BLACK.KNIGHT,
                        BLACK.BISHOP,
                        BLACK.QUEEN,
                        BLACK.KING,
                        BLACK.BISHOP,
                        BLACK.KNIGHT,
                        BLACK.ROOK,
                    ];
                if (rankIndex === 1) return Array(8).fill(BLACK.PAWN);
                if (rankIndex === 6) return Array(8).fill(WHITE.PAWN);
                if (rankIndex === 7)
                    return [
                        WHITE.ROOK,
                        WHITE.KNIGHT,
                        WHITE.BISHOP,
                        WHITE.QUEEN,
                        WHITE.KING,
                        WHITE.BISHOP,
                        WHITE.KNIGHT,
                        WHITE.ROOK,
                    ];

                return Array(8)
                    .fill()
                    .map((_, fileIndex) =>
                        (rankIndex + fileIndex) % 2 === 0
                            ? BOARD_CONFIG.SQUARES.LIGHT
                            : BOARD_CONFIG.SQUARES.DARK
                    );
            });
        return board;
    }

    isEmptySquare(piece) {
        return [BOARD_CONFIG.SQUARES.LIGHT, BOARD_CONFIG.SQUARES.DARK].includes(piece);
    }

    isWhitePiece(piece) {
        return Object.values(BOARD_CONFIG.PIECES.WHITE).includes(piece);
    }

    isBlackPiece(piece) {
        return Object.values(BOARD_CONFIG.PIECES.BLACK).includes(piece);
    }

    getSquareFromNotation(notation, color) {
        const [file, rank] = notation.split("");
        const fileIndex = FILES.indexOf(file.toLowerCase());
        const rankIndex = RANKS.indexOf(rank);
        return [7 - rankIndex, fileIndex]; // Same transformation for both colors
    }

    getNotationFromSquare(rank, file, color) {
        return `${FILES[file]}${RANKS[7 - rank]}`; // Same transformation for both colors
    }

    renderBoard(board, lastMove = null) {
        const files = BOARD_CONFIG.FILES;
        const ranks = BOARD_CONFIG.RANKS;

        let ascii = "  +---------------------+\n";
        ascii += `   ${files.split("").join("   ")}\n`;

        for (let i = 0; i < 8; i++) {
            const rank = 8 - i;
            let rowStr = rank + " | ";

            for (let j = 0; j < 8; j++) {
                let piece = board[i][j];

                // Check if this square was part of the last move
                if (
                    lastMove &&
                    ((i === lastMove.from.rank && j === lastMove.from.file) ||
                        (i === lastMove.to.rank && j === lastMove.to.file))
                ) {
                    piece = `[${piece}]`; // Highlight the piece with brackets
                } else {
                    piece = ` ${piece} `;
                }

                rowStr += piece;
            }

            rowStr += " |";
            ascii += rowStr + "\n";
        }

        ascii += "  +---------------------+\n";
        ascii += `   ${files.split("").join("   ")}\n`;

        return "```\n" + ascii + "```";
    }

    async makeMove(gameState, move) {
        const [fromFile, fromRank, toFile, toRank] = move.split("");
        const currentColor = gameState.isPlayerTurn ? gameState.playerColor : gameState.aiColor;
        const [fromY, fromX] = this.getSquareFromNotation(fromFile + fromRank, currentColor);
        const [toY, toX] = this.getSquareFromNotation(toFile + toRank, currentColor);

        const piece = gameState.board[fromY][fromX];
        gameState.board[toY][toX] = piece;
        gameState.board[fromY][fromX] =
            (fromY + fromX) % 2 === 0 ? BOARD_CONFIG.SQUARES.LIGHT : BOARD_CONFIG.SQUARES.DARK;

        // Store the last move
        gameState.lastMove = {
            from: { rank: fromY, file: fromX },
            to: { rank: toY, file: toX },
        };

        gameState.moveHistory.push(move);
        gameState.isPlayerTurn = !gameState.isPlayerTurn;

        try {
            saveHistory({
                userId: gameState.userId,
                userInput: move,
                botResponse: `Player color: ${
                    gameState.playerColor
                }; Move: ${move}; Move history: ${gameState.moveHistory.join(", ")}`,
            });
        } catch (error) {
            console.error("Error saving history:", error);
        }
    }

    getMoveGenerator(piece, isWhiteTurn) {
        const generators = {
            [BOARD_CONFIG.PIECES.WHITE.PAWN]: this.getPawnMoves,
            [BOARD_CONFIG.PIECES.BLACK.PAWN]: this.getPawnMoves,
            [BOARD_CONFIG.PIECES.WHITE.ROOK]: this.getRookMoves,
            [BOARD_CONFIG.PIECES.BLACK.ROOK]: this.getRookMoves,
            [BOARD_CONFIG.PIECES.WHITE.KNIGHT]: this.getKnightMoves,
            [BOARD_CONFIG.PIECES.BLACK.KNIGHT]: this.getKnightMoves,
            [BOARD_CONFIG.PIECES.WHITE.BISHOP]: this.getBishopMoves,
            [BOARD_CONFIG.PIECES.BLACK.BISHOP]: this.getBishopMoves,
            [BOARD_CONFIG.PIECES.WHITE.QUEEN]: (gameState, file, rank) => [
                ...this.getRookMoves(gameState, file, rank, isWhiteTurn),
                ...this.getBishopMoves(gameState, file, rank, isWhiteTurn),
            ],
            [BOARD_CONFIG.PIECES.BLACK.QUEEN]: (gameState, file, rank) => [
                ...this.getRookMoves(gameState, file, rank, isWhiteTurn),
                ...this.getBishopMoves(gameState, file, rank, isWhiteTurn),
            ],
            [BOARD_CONFIG.PIECES.WHITE.KING]: this.getKingMoves,
            [BOARD_CONFIG.PIECES.BLACK.KING]: this.getKingMoves,
        };
        return generators[piece];
    }

    getValidMoves(gameState, side) {
        const moves = [];
        const isWhiteTurn = side === "white";

        // Helper function to check if a piece belongs to the current side
        const isPieceBelongsToSide = piece => {
            if (isWhiteTurn) {
                return this.isWhitePiece(piece);
            }
            return this.isBlackPiece(piece);
        };

        // Iterate through the board
        for (let rank = 0; rank < 8; rank++) {
            for (let file = 0; file < 8; file++) {
                const piece = gameState.board[rank][file];

                // Skip if square is empty or piece belongs to opponent
                if (this.isEmptySquare(piece) || !isPieceBelongsToSide(piece)) {
                    continue;
                }

                // Get the move generator for the current piece
                const moveGenerator = this.getMoveGenerator(piece, isWhiteTurn);
                if (!moveGenerator) continue;

                // Generate potential moves for the piece
                const pieceMoves = moveGenerator.call(this, gameState, file, rank, isWhiteTurn);

                // Add moves that don't result in self-check
                for (const move of pieceMoves) {
                    const [fromFile, fromRank, toFile, toRank] = move.split("");
                    const [toY, toX] = this.getSquareFromNotation(toFile + toRank, side);

                    // Check if target square contains a friendly piece
                    const targetPiece = gameState.board[toY][toX];
                    if (!this.isEmptySquare(targetPiece) && isPieceBelongsToSide(targetPiece)) {
                        continue; // Skip moves that capture friendly pieces
                    }

                    // Create temporary board to test for check
                    const tempGameState = {
                        ...gameState,
                        board: gameState.board.map(row => [...row]),
                    };

                    // Make the move on temporary board
                    const [fromY, fromX] = this.getSquareFromNotation(fromFile + fromRank, side);
                    tempGameState.board[toY][toX] = tempGameState.board[fromY][fromX];
                    tempGameState.board[fromY][fromX] =
                        (fromY + fromX) % 2 === 0
                            ? BOARD_CONFIG.SQUARES.LIGHT
                            : BOARD_CONFIG.SQUARES.DARK;

                    // Add move if it doesn't leave king in check
                    if (!this.isKingInCheck(tempGameState, side)) {
                        moves.push(move);
                    }
                }
            }
        }

        return moves;
    }

    async getAiMove(gameState) {
        try {
            const validMoves = this.getValidMoves(gameState, gameState.aiColor);
            if (!validMoves.length) throw new Error("No valid moves available");

            const aiMessage = {
                role: "user",
                content: `You are playing chess as ${gameState.aiColor}. 
                Chess game constants: ${BOARD_CONFIG}
                Current position (FEN): ${this.boardToFEN(gameState.board)}
                Previous moves: ${gameState.moveHistory.join(" ")}
                Valid moves: ${validMoves.join(", ")}
                Choose one of the valid moves listed above.
                Respond with only the move in the format like 'e2e4'.`,
            };

            for (let attempt = 0; attempt < 5; attempt++) {
                const response = await this.anthropic.messages.create({
                    model: "claude-3-sonnet-20240229",
                    max_tokens: 1024,
                    messages: [aiMessage],
                });

                const move = response.content[0].text.trim();
                if (validMoves.includes(move)) return move;
            }

            return validMoves[Math.floor(Math.random() * validMoves.length)];
        } catch (error) {
            console.error("AI move error:", error);
            const validMoves = this.getValidMoves(gameState, gameState.aiColor);
            return validMoves[Math.floor(Math.random() * validMoves.length)];
        }
    }

    // Game Flow Control
    async handleMove(ctx) {
        const move = ctx.match[1];
        const gameState = this.games.get(ctx.chat.id);

        await this.executeMove(gameState, move, ctx);
        await this.handleAIResponse(gameState, ctx);
    }

    async updateGameDisplay(ctx, message, gameState) {
        try {
            const boardDisplay = this.renderBoard(gameState.board, gameState.lastMove);
            const keyboard = gameState.isPlayerTurn ? this.getMoveKeyboard(gameState) : undefined;

            await ctx.reply(`${message}\n${boardDisplay}`, keyboard);
        } catch (error) {
            console.error("Error updating game display:", error);
            await ctx.reply("Error updating game display. Please try again.");
        }
    }

    async handleAIResponse(gameState, ctx) {
        if (!gameState.isPlayerTurn) {
            const aiMove = await this.getAiMove(gameState);
            await ctx.reply(
                `AI move: ${this.parseMoveToReadable(aiMove, gameState, gameState.aiColor)}`
            );
            await this.makeMove(gameState, aiMove);
            await this.updateGameDisplay(ctx, ``, gameState);
        }
    }

    async executeMove(gameState, move, ctx) {
        await ctx.reply(
            `Your move: ${this.parseMoveToReadable(move, gameState, gameState.playerColor)}`
        );
        await this.makeMove(gameState, move);
        await this.updateGameDisplay(ctx, ``, gameState);
    }

    async handlePageChange(ctx) {
        const page = parseInt(ctx.match[1]);
        const gameState = this.games.get(ctx.chat.id);

        if (!gameState) {
            await ctx.reply("No active game. Start a new game with /chess");
            return;
        }

        await ctx.editMessageReplyMarkup(this.getMoveKeyboard(gameState, page).reply_markup);
    }

    getRookMoves(gameState, file, rank, isWhiteTurn) {
        const moves = [];
        const directions = [
            [0, 1],
            [0, -1],
            [1, 0],
            [-1, 0],
        ];
        const turnColor = gameState.isPlayerTurn ? gameState.playerColor : gameState.aiColor;

        const isPieceBelongsToSide = piece => {
            if (isWhiteTurn) {
                return this.isWhitePiece(piece);
            }
            return this.isBlackPiece(piece);
        };

        for (const [dx, dy] of directions) {
            let newFile = file + dx;
            let newRank = rank + dy;

            while (newFile >= 0 && newFile < 8 && newRank >= 0 && newRank < 8) {
                const targetPiece = gameState.board[newRank][newFile];

                if (this.isEmptySquare(targetPiece)) {
                    moves.push(
                        this.getNotationFromSquare(rank, file, turnColor) +
                            this.getNotationFromSquare(newRank, newFile, turnColor)
                    );
                } else if (!isPieceBelongsToSide(targetPiece)) {
                    // Only add capture move if the target piece is an opponent's piece
                    moves.push(
                        this.getNotationFromSquare(rank, file, turnColor) +
                            this.getNotationFromSquare(newRank, newFile, turnColor)
                    );
                    break;
                } else {
                    break; // Stop at friendly pieces
                }

                newFile += dx;
                newRank += dy;
            }
        }

        return moves;
    }

    getKingMoves(gameState, file, rank, isWhiteTurn) {
        const moves = [];
        const directions = [
            [0, 1],
            [0, -1],
            [1, 0],
            [-1, 0],
            [1, 1],
            [1, -1],
            [-1, 1],
            [-1, -1],
        ];
        const turnColor = gameState.isPlayerTurn ? gameState.playerColor : gameState.aiColor;

        const isPieceBelongsToSide = piece => {
            if (isWhiteTurn) {
                return this.isWhitePiece(piece);
            }
            return this.isBlackPiece(piece);
        };

        for (const [dx, dy] of directions) {
            const newFile = file + dx;
            const newRank = rank + dy;

            if (newFile >= 0 && newFile < 8 && newRank >= 0 && newRank < 8) {
                const targetPiece = gameState.board[newRank][newFile];

                if (this.isEmptySquare(targetPiece)) continue;
                if (isPieceBelongsToSide(targetPiece)) continue;

                moves.push(
                    this.getNotationFromSquare(rank, file, turnColor) +
                        this.getNotationFromSquare(newRank, newFile, turnColor)
                );
            }
        }

        return moves;
    }

    getKnightMoves(gameState, file, rank, isWhiteTurn) {
        const moves = [];
        const knightMoves = [
            [2, 1],
            [2, -1],
            [-2, 1],
            [-2, -1],
            [1, 2],
            [1, -2],
            [-1, 2],
            [-1, -2],
        ];
        const turnColor = isWhiteTurn ? "white" : "black";

        for (const [dx, dy] of knightMoves) {
            const newFile = file + dx;
            const newRank = rank + dy;

            if (newFile >= 0 && newFile < 8 && newRank >= 0 && newRank < 8) {
                const targetPiece = gameState.board[newRank][newFile];
                if (
                    !targetPiece ||
                    (isWhiteTurn && this.isBlackPiece(targetPiece)) ||
                    (!isWhiteTurn && this.isWhitePiece(targetPiece))
                ) {
                    moves.push(
                        this.getNotationFromSquare(rank, file, turnColor) +
                            this.getNotationFromSquare(newRank, newFile, turnColor)
                    );
                }
            }
        }

        return moves;
    }

    getBishopMoves(gameState, file, rank, isWhiteTurn) {
        const moves = [];
        const directions = [
            [1, 1],
            [1, -1],
            [-1, 1],
            [-1, -1],
        ];
        const turnColor = gameState.isPlayerTurn ? gameState.playerColor : gameState.aiColor;

        for (const [dx, dy] of directions) {
            let newFile = file + dx;
            let newRank = rank + dy;

            while (newFile >= 0 && newFile < 8 && newRank >= 0 && newRank < 8) {
                const targetPiece = gameState.board[newRank][newFile];

                if (this.isEmptySquare(targetPiece)) {
                    moves.push(
                        this.getNotationFromSquare(rank, file, turnColor) +
                            this.getNotationFromSquare(newRank, newFile, turnColor)
                    );
                } else if (
                    (isWhiteTurn && this.isBlackPiece(targetPiece)) ||
                    (!isWhiteTurn && this.isWhitePiece(targetPiece))
                ) {
                    moves.push(
                        this.getNotationFromSquare(rank, file, turnColor) +
                            this.getNotationFromSquare(newRank, newFile, turnColor)
                    );
                    break;
                } else {
                    break;
                }

                newFile += dx;
                newRank += dy;
            }
        }

        return moves;
    }

    async startNewGame(ctx) {
        // const playerColor = Math.random() < 0.5 ? "white" : "black";
        const playerColor = "black";
        const gameState = {
            board: this.initializeBoard(),
            // playerColor: playerColor,
            // aiColor: playerColor === "white" ? "black" : "white",
            // isPlayerTurn: playerColor === "white",
            isPlayerTurn: false,
            playerColor: "black",
            aiColor: "white",
            moveHistory: [],
            userId: ctx.from.id,
            lastMove: null,
        };

        this.games.set(ctx.chat.id, gameState);

        await ctx.reply(
            `New chess game started! You play as ${playerColor}.\n\n${this.renderBoard(
                gameState.board,
                gameState.lastMove
            )}`,
            gameState.playerColor === "white" ? this.getMoveKeyboard(gameState) : undefined
        );

        await ctx.reply(
            `${BOARD_CONFIG.PIECES.BLACK.ROOK} - Rook\n${BOARD_CONFIG.PIECES.BLACK.KNIGHT} - Knight\n${BOARD_CONFIG.PIECES.BLACK.BISHOP} - Bishop\n${BOARD_CONFIG.PIECES.BLACK.QUEEN} - Queen\n${BOARD_CONFIG.PIECES.BLACK.KING} - King\n${BOARD_CONFIG.PIECES.BLACK.PAWN} - Pawn`
        );
        await ctx.reply(
            `${BOARD_CONFIG.PIECES.BLACK.ROOK} - black, ${BOARD_CONFIG.PIECES.WHITE.ROOK} - white`
        );

        saveHistory({
            userId: ctx.from.id,
            userInput: "Start new chess game",
            botResponse: `Player color: ${playerColor}`,
        });

        if (playerColor === "black") {
            const aiMove = await this.getAiMove(gameState);
            await ctx.reply(
                `AI move: ${this.parseMoveToReadable(aiMove, gameState, gameState.aiColor)}\n`
            );
            await this.makeMove(gameState, aiMove);
            await ctx.reply(
                `${this.renderBoard(gameState.board, gameState.lastMove)}`,
                this.getMoveKeyboard(gameState)
            );
        }

        this.bot.action(/move_(.+)/, ctx => this.handleMove(ctx));
        this.bot.action("resign", ctx => this.handleResign(ctx));
        this.bot.action(/page_(\d+)/, ctx => this.handlePageChange(ctx));
        // setup action for text command
        this.bot.on(message("text"), ctx => this.handleTextCommand(ctx));
    }

    parseMoveToReadable(move, gameState, color) {
        try {
            const [fromFile, fromRank, toFile, toRank] = move.split("");
            const fromSquare = this.getSquareFromNotation(fromFile + fromRank, color);
            const toSquare = this.getSquareFromNotation(toFile + toRank, color);
            const piece = gameState.board[fromSquare[0]][fromSquare[1]];

            // Find the piece name by checking both WHITE and BLACK pieces
            let pieceName = null;

            // Check WHITE pieces
            for (const [name, value] of Object.entries(BOARD_CONFIG.PIECES.WHITE)) {
                if (value === piece) {
                    pieceName = name;
                    break;
                }
            }

            // If not found in WHITE pieces, check BLACK pieces
            if (!pieceName) {
                for (const [name, value] of Object.entries(BOARD_CONFIG.PIECES.BLACK)) {
                    if (value === piece) {
                        pieceName = name;
                        break;
                    }
                }
            }

            return `${pieceName} from ${fromFile}${fromRank} to ${toFile}${toRank}`;
        } catch (error) {
            console.error("Error parsing move:", error);
            return "Invalid move";
        }
    }
    getMoveKeyboard(gameState, page = 0) {
        const moves = this.getValidMoves(gameState, gameState.playerColor);
        const pageSize = 8;
        const totalPages = Math.ceil(moves.length / pageSize);
        const currentPage = Math.min(page, totalPages - 1);
        const start = currentPage * pageSize;
        const end = Math.min(start + pageSize, moves.length);

        const keyboard = [];

        // Add move buttons for current page
        const pageMoves = moves.slice(start, end);
        for (let i = 0; i < pageMoves.length; i += 2) {
            const row = [];
            row.push(Markup.button.callback(pageMoves[i], `move_${pageMoves[i]}`));
            if (i + 1 < pageMoves.length) {
                row.push(Markup.button.callback(pageMoves[i + 1], `move_${pageMoves[i + 1]}`));
            }
            keyboard.push(row);
        }

        // Add navigation row
        const navigationRow = [];
        if (currentPage > 0) {
            navigationRow.push(Markup.button.callback("⬅️ Prev", `page_${currentPage - 1}`));
        }
        navigationRow.push(Markup.button.callback("❌ Resign", "resign"));
        if (currentPage < totalPages - 1) {
            navigationRow.push(Markup.button.callback("Next ➡️", `page_${currentPage + 1}`));
        }
        keyboard.push(navigationRow);

        // Add page indicator
        if (totalPages > 1) {
            keyboard.push([
                Markup.button.callback(`Page ${currentPage + 1}/${totalPages}`, "dummy_action"),
            ]);
        }

        return Markup.inlineKeyboard(keyboard);
    }

    // // Add this helper method to check if the king is in check
    isKingInCheck(gameState, side) {
        // Find the king's position
        let kingPos = null;
        const kingPiece =
            side === "white" ? BOARD_CONFIG.PIECES.WHITE.KING : BOARD_CONFIG.PIECES.BLACK.KING;

        for (let rank = 0; rank < 8; rank++) {
            for (let file = 0; file < 8; file++) {
                if (gameState.board[rank][file] === kingPiece) {
                    kingPos = { rank, file };
                    break;
                }
            }
            if (kingPos) break;
        }

        if (!kingPos) return false; // Should never happen in a valid game

        // Check if any opponent's piece can capture the king
        const opponentSide = side === "white" ? "black" : "white";
        const opponentMoves = this.getAllAttackingMoves(gameState, opponentSide);

        return opponentMoves.some(move => {
            const [, , toFile, toRank] = move.split("");
            const [toY, toX] = this.getSquareFromNotation(toFile + toRank, opponentSide);
            return toY === kingPos.rank && toX === kingPos.file;
        });
    }

    // Helper method to get all possible attacking moves for a side
    getAllAttackingMoves(gameState, side) {
        // Similar to getValidMoves but without checking for self-check
        // This prevents infinite recursion
        // Implementation similar to getValidMoves but simpler
        // Only returns moves that could potentially capture pieces
        // ...

        const moves = [];
        const isWhiteTurn = side === "white";

        // Helper function to check if a piece belongs to the current side
        const isPieceBelongsToSide = piece => {
            if (isWhiteTurn) {
                return Object.values(BOARD_CONFIG.PIECES.WHITE).includes(piece);
            }
            return Object.values(BOARD_CONFIG.PIECES.BLACK).includes(piece);
        };

        for (let rank = 0; rank < 8; rank++) {
            for (let file = 0; file < 8; file++) {
                const piece = gameState.board[rank][file];

                // Skip if square is empty or piece belongs to opponent
                if (this.isEmptySquare(piece) || !isPieceBelongsToSide(piece)) {
                    continue;
                }

                // Determine piece type and generate moves accordingly
                switch (piece) {
                    case BOARD_CONFIG.PIECES.WHITE.PAWN:
                    case BOARD_CONFIG.PIECES.BLACK.PAWN:
                        moves.push(...this.getPawnMoves(gameState, file, rank));
                        break;

                    case BOARD_CONFIG.PIECES.WHITE.ROOK:
                    case BOARD_CONFIG.PIECES.BLACK.ROOK:
                        moves.push(...this.getRookMoves(gameState, file, rank, isWhiteTurn));
                        break;

                    case BOARD_CONFIG.PIECES.WHITE.KNIGHT:
                    case BOARD_CONFIG.PIECES.BLACK.KNIGHT:
                        moves.push(...this.getKnightMoves(gameState, file, rank, isWhiteTurn));
                        break;

                    case BOARD_CONFIG.PIECES.WHITE.BISHOP:
                    case BOARD_CONFIG.PIECES.BLACK.BISHOP:
                        moves.push(...this.getBishopMoves(gameState, file, rank, isWhiteTurn));
                        break;

                    case BOARD_CONFIG.PIECES.WHITE.QUEEN:
                    case BOARD_CONFIG.PIECES.BLACK.QUEEN:
                        // Queen moves combine rook and bishop moves
                        moves.push(...this.getRookMoves(gameState, file, rank, isWhiteTurn));
                        moves.push(...this.getBishopMoves(gameState, file, rank, isWhiteTurn));
                        break;

                    case BOARD_CONFIG.PIECES.WHITE.KING:
                    case BOARD_CONFIG.PIECES.BLACK.KING:
                        moves.push(...this.getKingMoves(gameState, file, rank, isWhiteTurn));
                        break;
                }
            }
        }

        return moves;
    }

    boardToFEN(board) {
        let fen = "";
        for (let rank = 0; rank < 8; rank++) {
            let emptyCount = 0;
            for (let file = 0; file < 8; file++) {
                const piece = board[rank][file];
                if (this.isEmptySquare(piece)) {
                    emptyCount++;
                } else {
                    if (emptyCount > 0) {
                        fen += emptyCount;
                        emptyCount = 0;
                    }
                    fen += this.pieceToFEN(piece);
                }
            }
            if (emptyCount > 0) {
                fen += emptyCount;
            }
            if (rank < 7) fen += "/";
        }
        return fen;
    }

    pieceToFEN(piece) {
        const fenMap = {
            [BOARD_CONFIG.PIECES.WHITE.KING]: "K",
            [BOARD_CONFIG.PIECES.WHITE.QUEEN]: "Q",
            [BOARD_CONFIG.PIECES.WHITE.ROOK]: "R",
            [BOARD_CONFIG.PIECES.WHITE.BISHOP]: "B",
            [BOARD_CONFIG.PIECES.WHITE.KNIGHT]: "N",
            [BOARD_CONFIG.PIECES.WHITE.PAWN]: "P",
            [BOARD_CONFIG.PIECES.BLACK.KING]: "k",
            [BOARD_CONFIG.PIECES.BLACK.QUEEN]: "q",
            [BOARD_CONFIG.PIECES.BLACK.ROOK]: "r",
            [BOARD_CONFIG.PIECES.BLACK.BISHOP]: "b",
            [BOARD_CONFIG.PIECES.BLACK.KNIGHT]: "n",
            [BOARD_CONFIG.PIECES.BLACK.PAWN]: "p",
        };
        return fenMap[piece] || "";
    }

    async handleResign(ctx) {
        const gameState = this.games.get(ctx.chat.id);
        if (gameState) {
            this.games.delete(ctx.chat.id);
            await this.sendMenu(ctx, "Game over. You resigned.");
        }
    }

    getPawnMoves(gameState, file, rank, isWhiteTurn) {
        const moves = [];
        const direction = isWhiteTurn ? -1 : 1; // Direction is based on piece color, not perspective
        const startRank = isWhiteTurn ? 6 : 1; // Starting rank for pawns

        // Forward move
        const newRank = rank + direction;
        if (newRank >= 0 && newRank < 8) {
            // Single step forward
            if (this.isEmptySquare(gameState.board[newRank][file])) {
                moves.push(
                    this.getNotationFromSquare(rank, file, gameState.playerColor) +
                        this.getNotationFromSquare(newRank, file, gameState.playerColor)
                );

                // Double step from starting position
                if (rank === startRank) {
                    const doubleRank = rank + 2 * direction;
                    if (
                        doubleRank >= 0 &&
                        doubleRank < 8 &&
                        this.isEmptySquare(gameState.board[doubleRank][file]) &&
                        this.isEmptySquare(gameState.board[newRank][file])
                    ) {
                        moves.push(
                            this.getNotationFromSquare(rank, file, gameState.playerColor) +
                                this.getNotationFromSquare(doubleRank, file, gameState.playerColor)
                        );
                    }
                }
            }

            // Captures
            for (const fileOffset of [-1, 1]) {
                const newFile = file + fileOffset;
                if (newFile >= 0 && newFile < 8) {
                    const targetPiece = gameState.board[newRank][newFile];
                    if (
                        !this.isEmptySquare(targetPiece) &&
                        ((isWhiteTurn && this.isBlackPiece(targetPiece)) ||
                            (!isWhiteTurn && this.isWhitePiece(targetPiece)))
                    ) {
                        moves.push(
                            this.getNotationFromSquare(rank, file, gameState.playerColor) +
                                this.getNotationFromSquare(newRank, newFile, gameState.playerColor)
                        );
                    }
                }
            }
        }

        return moves;
    }
}
