import { Markup } from "telegraf";
import Anthropic from "@anthropic-ai/sdk";
import { saveHistory } from "../db.js";

const BOARD_CONFIG = {
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
        this.bot.action(/move_(.+)/, ctx => this.handleMove(ctx));
        this.bot.action("resign", ctx => this.handleResign(ctx));
        this.bot.action(/page_(\d+)/, ctx => this.handlePageChange(ctx));
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

    getSquareFromNotation(notation, color) {
        const [file, rank] = notation.split("");
        const fileIndex = BOARD_CONFIG.FILES.indexOf(file.toLowerCase());
        const rankIndex = BOARD_CONFIG.RANKS.indexOf(rank);
        return color === "black" ? [7 - rankIndex, 7 - fileIndex] : [7 - rankIndex, fileIndex];
    }

    getNotationFromSquare(rank, file, color) {
        if (color === "black") {
            return `${BOARD_CONFIG.FILES[7 - file]}${BOARD_CONFIG.RANKS[rank]}`;
        }
        return `${BOARD_CONFIG.FILES[file]}${BOARD_CONFIG.RANKS[rank]}`;
    }

    isValidMove(gameState, move) {
        if (!move?.length === 4) return false;
        const validMoves = this.getValidMoves(
            gameState,
            gameState.isPlayerTurn ? gameState.playerColor : gameState.aiColor
        );
        return validMoves.includes(move);
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

    renderBoard(board, playerColor = "white") {
        const ranks = playerColor === "white" ? "87654321" : "12345678";
        const files = playerColor === "white" ? "abcdefgh" : "hgfedcba";

        let ascii = "  +----------------+\n";
        ascii += `     ${files.split("").join(" ")}\n`;

        for (let i = 0; i < 8; i++) {
            const row = playerColor === "white" ? i : 7 - i;
            const rowStr =
                ranks[i] +
                " | " +
                board[row]
                    .map((piece, j) => board[row][playerColor === "white" ? j : 7 - j])
                    .join(" ") +
                " |";
            ascii += rowStr + "\n";
        }

        ascii += "  +----------------+\n";
        ascii += `     ${files.split("").join(" ")}\n`;

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

        gameState.moveHistory.push(move);
        gameState.isPlayerTurn = !gameState.isPlayerTurn;

        await saveHistory({
            userId: gameState.userId,
            userInput: move,
            botResponse: `Player color: ${
                gameState.playerColor
            }; Move: ${move}; Board: ${JSON.stringify(
                gameState.board
            )}; Move history: ${gameState.moveHistory.join(", ")}`,
        });
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

        for (let rank = 0; rank < 8; rank++) {
            for (let file = 0; file < 8; file++) {
                const piece = gameState.board[rank][file];

                if (this.isEmptySquare(piece)) continue;
                if (
                    (isWhiteTurn && !this.isWhitePiece(piece)) ||
                    (!isWhiteTurn && !this.isBlackPiece(piece))
                )
                    continue;

                const moveGenerator = this.getMoveGenerator(piece, isWhiteTurn);
                if (moveGenerator) {
                    moves.push(...moveGenerator.call(this, gameState, file, rank, isWhiteTurn));
                }
            }
        }

        return moves.filter(move => !this.wouldResultInCheck(gameState, move, side));
    }

    wouldResultInCheck(gameState, move, side) {
        const tempGameState = {
            ...gameState,
            board: gameState.board.map(row => [...row]),
        };

        const [fromFile, fromRank, toFile, toRank] = move.split("");
        const [fromY, fromX] = this.getSquareFromNotation(fromFile + fromRank, side);
        const [toY, toX] = this.getSquareFromNotation(toFile + toRank, side);

        tempGameState.board[toY][toX] = tempGameState.board[fromY][fromX];
        tempGameState.board[fromY][fromX] =
            (fromY + fromX) % 2 === 0 ? BOARD_CONFIG.SQUARES.LIGHT : BOARD_CONFIG.SQUARES.DARK;

        return this.isKingInCheck(tempGameState, side);
    }

    async getAiMove(gameState) {
        try {
            const validMoves = this.getValidMoves(gameState, gameState.aiColor);
            if (!validMoves.length) throw new Error("No valid moves available");

            const aiMessage = {
                role: "user",
                content: `You are playing chess as ${gameState.aiColor}. 
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
    // constructor(bot, anthropic, sendMenu) {
    //     this.bot = bot;
    //     this.anthropic = anthropic;
    //     this.sendMenu = sendMenu;
    //     this.games = new Map();
    //     this.setupBotActions();
    // }

    // // Bot Action Setup
    // setupBotActions() {
    //     this.bot.action("chess", ctx => this.startNewGame(ctx));
    //     this.bot.action(/move_(.+)/, ctx => this.handleMove(ctx));
    //     this.bot.action("resign", ctx => this.handleResign(ctx));
    //     this.bot.action(/page_(\d+)/, ctx => this.handlePageChange(ctx));
    //     this.bot.action("dummy_action", ctx => ctx.answerCbQuery());
    // }

    // // Game State Management
    // initializeBoard() {
    //     const { WHITE, BLACK } = BOARD_CONFIG.PIECES;
    //     return [
    //         [
    //             BLACK.ROOK,
    //             BLACK.KNIGHT,
    //             BLACK.BISHOP,
    //             BLACK.QUEEN,
    //             BLACK.KING,
    //             BLACK.BISHOP,
    //             BLACK.KNIGHT,
    //             BLACK.ROOK,
    //         ],
    //         [
    //             BLACK.PAWN,
    //             BLACK.PAWN,
    //             BLACK.PAWN,
    //             BLACK.PAWN,
    //             BLACK.PAWN,
    //             BLACK.PAWN,
    //             BLACK.PAWN,
    //             BLACK.PAWN,
    //         ],
    //         Array(8)
    //             .fill()
    //             .map((_, i) =>
    //                 i % 2 === 0 ? BOARD_CONFIG.SQUARES.LIGHT : BOARD_CONFIG.SQUARES.DARK
    //             ),
    //         Array(8)
    //             .fill()
    //             .map((_, i) =>
    //                 i % 2 === 1 ? BOARD_CONFIG.SQUARES.LIGHT : BOARD_CONFIG.SQUARES.DARK
    //             ),
    //         Array(8)
    //             .fill()
    //             .map((_, i) =>
    //                 i % 2 === 0 ? BOARD_CONFIG.SQUARES.LIGHT : BOARD_CONFIG.SQUARES.DARK
    //             ),
    //         Array(8)
    //             .fill()
    //             .map((_, i) =>
    //                 i % 2 === 1 ? BOARD_CONFIG.SQUARES.LIGHT : BOARD_CONFIG.SQUARES.DARK
    //             ),
    //         [
    //             WHITE.PAWN,
    //             WHITE.PAWN,
    //             WHITE.PAWN,
    //             WHITE.PAWN,
    //             WHITE.PAWN,
    //             WHITE.PAWN,
    //             WHITE.PAWN,
    //             WHITE.PAWN,
    //         ],
    //         [
    //             WHITE.ROOK,
    //             WHITE.KNIGHT,
    //             WHITE.BISHOP,
    //             WHITE.QUEEN,
    //             WHITE.KING,
    //             WHITE.BISHOP,
    //             WHITE.KNIGHT,
    //             WHITE.ROOK,
    //         ],
    //     ];
    // }

    // createEmptyRow(startLight) {
    //     return Array(8)
    //         .fill()
    //         .map((_, i) =>
    //             (i + (startLight ? 0 : 1)) % 2 === 0
    //                 ? BOARD_CONFIG.SQUARES.LIGHT
    //                 : BOARD_CONFIG.SQUARES.DARK
    //         );
    // }

    // // Move Validation
    // isValidMove(gameState, move) {
    //     if (!move || move.length !== 4) return false;

    //     const validMoves = this.getValidMoves(
    //         gameState,
    //         gameState.isPlayerTurn
    //             ? gameState.playerColor
    //             : gameState.playerColor === "white"
    //             ? "black"
    //             : "white"
    //     );

    //     return validMoves.includes(move);
    // }
    // // Piece Movement Helpers
    // isEmptySquare(piece) {
    //     return [BOARD_CONFIG.SQUARES.LIGHT, BOARD_CONFIG.SQUARES.DARK].includes(piece);
    // }

    // isWhitePiece(piece) {
    //     return Object.values(BOARD_CONFIG.PIECES.WHITE).includes(piece);
    // }

    // isBlackPiece(piece) {
    //     return Object.values(BOARD_CONFIG.PIECES.BLACK).includes(piece);
    // }

    // // Board Rendering
    // renderBoard(board, playerColor = "white") {
    //     // For black's perspective, we need to flip both ranks and files
    //     const ranks = playerColor === "white" ? "87654321" : "12345678";
    //     const files = playerColor === "white" ? "abcdefgh" : "hgfedcba";

    //     let ascii = "  +----------------+\n";
    //     ascii += `     ${files.split("").join(" ")}\n`;

    //     for (let i = 0; i < 8; i++) {
    //         const row = playerColor === "white" ? i : 7 - i;
    //         let rowStr = `${ranks[i]} | `;
    //         for (let j = 0; j < 8; j++) {
    //             const col = playerColor === "white" ? j : 7 - j;
    //             rowStr += board[row][col] + " ";
    //         }
    //         ascii += rowStr + "|\n";
    //     }

    //     ascii += "  +----------------+\n";
    //     ascii += `     ${files.split("").join(" ")}\n`;

    //     return "```\n" + ascii + "```";
    // }

    // renderRow(row, playerColor) {
    //     const rowPieces = playerColor === "white" ? row : [...row].reverse();
    //     return rowPieces.join(" ");
    // }

    // // Game Flow Control
    async handleMove(ctx) {
        const move = ctx.match[1];
        const gameState = this.games.get(ctx.chat.id);

        await this.executeMove(gameState, move, ctx);
        await this.handleAIResponse(gameState, ctx);
    }

    async updateGameDisplay(ctx, message, gameState) {
        try {
            const boardDisplay = this.renderBoard(gameState.board, gameState.playerColor);
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
            await this.makeMove(gameState, aiMove);
            await this.updateGameDisplay(ctx, `AI move: ${aiMove}`, gameState);
        }
    }

    async executeMove(gameState, move, ctx) {
        await this.makeMove(gameState, move);
        await this.updateGameDisplay(ctx, `Your move: ${move}`, gameState);
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

    // getSquareFromNotation(notation, color) {
    //     const [file, rank] = notation.split("");
    //     const fileIndex = BOARD_CONFIG.FILES.indexOf(file.toLowerCase());
    //     const rankIndex = BOARD_CONFIG.RANKS.indexOf(rank);

    //     // For black's perspective, we need to flip both coordinates
    //     if (color === "black") {
    //         return [7 - rankIndex, 7 - fileIndex];
    //     }
    //     return [7 - rankIndex, fileIndex];
    // }

    // getNotationFromSquare(rank, file, color) {
    //     if (color === "black") {
    //         return BOARD_CONFIG.FILES[7 - file] + BOARD_CONFIG.RANKS[rank];
    //     }
    //     return BOARD_CONFIG.FILES[file] + BOARD_CONFIG.RANKS[rank];
    // }

    // async makeMove(gameState, move) {
    //     const [fromFile, fromRank, toFile, toRank] = move.split("");
    //     const [fromY, fromX] = this.getSquareFromNotation(
    //         fromFile + fromRank,
    //         gameState.isPlayerTurn ? gameState.playerColor : gameState.aiColor
    //     );
    //     const [toY, toX] = this.getSquareFromNotation(toFile + toRank, gameState.playerColor);

    //     // Validate the move
    //     const piece = gameState.board[fromY][fromX];
    //     if (this.isEmptySquare(piece)) {
    //     }

    //     // Make the move
    //     gameState.board[toY][toX] = piece;
    //     gameState.board[fromY][fromX] =
    //         (fromY + fromX) % 2 === 0 ? BOARD_CONFIG.SQUARES.LIGHT : BOARD_CONFIG.SQUARES.DARK;

    //     gameState.moveHistory.push(move);
    //     gameState.isPlayerTurn = !gameState.isPlayerTurn;

    //     // Save the move history
    //     saveHistory({
    //         userId: gameState.userId,
    //         userInput: move,
    //         botResponse: `Player color: ${
    //             gameState.playerColor
    //         }; Move: ${move}; Board: ${JSON.stringify(
    //             gameState.board
    //         )}; Move history: ${gameState.moveHistory.join(", ")}`,
    //     });
    // }

    // isLegalPawnMove(gameState, fromFile, fromRank, toFile, toRank) {
    //     const isWhite = gameState.playerColor === "white";
    //     const direction = isWhite ? -1 : 1;
    //     const rankDiff = toRank - fromRank;
    //     const fileDiff = Math.abs(toFile - fromFile);

    //     // Basic pawn move validation
    //     if (fileDiff > 1) return false;
    //     if (direction * rankDiff < 0) return false; // Can't move backwards
    //     if (Math.abs(rankDiff) > 2) return false;

    //     // If it's a diagonal move (capture)
    //     if (fileDiff === 1) {
    //         // Must be capturing an enemy piece
    //         const targetPiece = gameState.board[toRank][toFile];
    //         if (isWhite && !this.isBlackPiece(targetPiece)) return false;
    //         if (!isWhite && !this.isWhitePiece(targetPiece)) return false;
    //         if (Math.abs(rankDiff) !== 1) return false;
    //     }

    //     // If it's a forward move
    //     if (fileDiff === 0) {
    //         // Square must be empty
    //         if (!this.isEmptySquare(gameState.board[toRank][toFile])) return false;

    //         // If it's a double move
    //         if (Math.abs(rankDiff) === 2) {
    //             // Must be from starting position
    //             const startRank = isWhite ? 6 : 1;
    //             if (fromRank !== startRank) return false;

    //             // Path must be clear
    //             const middleRank = fromRank + direction;
    //             if (!this.isEmptySquare(gameState.board[middleRank][fromFile])) return false;
    //         }
    //     }

    //     return true;
    // }

    // getPawnMoves(gameState, file, rank) {
    //     const moves = [];
    //     const isWhite = gameState.playerColor === "white";
    //     const direction = isWhite ? -1 : 1;
    //     const turnColor = gameState.isPlayerTurn ? gameState.playerColor : gameState.aiColor;

    //     // Forward moves
    //     const newRank = rank + direction;
    //     if (newRank >= 0 && newRank < 8) {
    //         // Single step forward
    //         if (this.isLegalPawnMove(gameState, file, rank, file, newRank)) {
    //             moves.push(
    //                 this.getNotationFromSquare(rank, file, turnColor) +
    //                     this.getNotationFromSquare(newRank, file, turnColor)
    //             );
    //         }

    //         // Double step from starting position
    //         const startRank = isWhite ? 6 : 1;
    //         if (rank === startRank) {
    //             const doubleRank = rank + 2 * direction;
    //             if (this.isLegalPawnMove(gameState, file, rank, file, doubleRank)) {
    //                 moves.push(
    //                     this.getNotationFromSquare(rank, file, turnColor) +
    //                         this.getNotationFromSquare(doubleRank, file, turnColor)
    //                 );
    //             }
    //         }

    //         // Captures
    //         for (const fileOffset of [-1, 1]) {
    //             const newFile = file + fileOffset;
    //             if (newFile >= 0 && newFile < 8) {
    //                 if (this.isLegalPawnMove(gameState, file, rank, newFile, newRank)) {
    //                     moves.push(
    //                         this.getNotationFromSquare(rank, file, turnColor) +
    //                             this.getNotationFromSquare(newRank, newFile, turnColor)
    //                     );
    //                 }
    //             }
    //         }
    //     }

    //     return moves;
    // }

    // // Helper function to transform coordinates for piece moves
    // transformMoves(moves, playerColor) {
    //     if (playerColor === "white") return moves;

    //     return moves.map(move => {
    //         const [fromFile, fromRank, toFile, toRank] = move.split("");
    //         const newFromFile = FILES[7 - FILES.indexOf(fromFile)];
    //         const newToFile = FILES[7 - FILES.indexOf(toFile)];
    //         const newFromRank = RANKS[7 - RANKS.indexOf(fromRank)];
    //         const newToRank = RANKS[7 - RANKS.indexOf(toRank)];
    //         return `${newFromFile}${newFromRank}${newToFile}${newToRank}`;
    //     });
    // }

    // // Update the existing piece move functions to use coordinate transformation
    getRookMoves(gameState, file, rank, isWhiteTurn) {
        const moves = [];
        const directions = [
            [0, 1],
            [0, -1],
            [1, 0],
            [-1, 0],
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

        for (const [dx, dy] of directions) {
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
        const turnColor = gameState.isPlayerTurn ? gameState.playerColor : gameState.aiColor;

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
        };

        this.games.set(ctx.chat.id, gameState);

        await ctx.reply(
            `New chess game started! You play as ${playerColor}.\n\n${this.renderBoard(
                gameState.board,
                gameState.playerColor
            )}`,
            gameState.playerColor === "white" ? this.getMoveKeyboard(gameState) : undefined
        );

        await ctx.reply(`♜ - Rook\n♞ - Knight\n♝ - Bishop\n♛ - Queen\n♚ - King\n♟ - Pawn`);
        await ctx.reply(`♜ - black, ♖ - white`);

        saveHistory({
            userId: ctx.from.id,
            userInput: "Start new chess game",
            botResponse: `Player color: ${playerColor}`,
        });

        if (playerColor === "black") {
            const aiMove = await this.getAiMove(gameState);
            await this.makeMove(gameState, aiMove);
            await ctx.reply(
                `AI move: ${aiMove}\n${this.renderBoard(gameState.board, playerColor)}`,
                this.getMoveKeyboard(gameState)
            );
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

    // getValidMoves(gameState, side) {
    //     const moves = [];
    //     const isWhiteTurn = side === "white";

    //     // Helper function to check if a piece belongs to the current side
    //     const isPieceBelongsToSide = piece => {
    //         if (isWhiteTurn) {
    //             return Object.values(BOARD_CONFIG.PIECES.WHITE).includes(piece);
    //         }
    //         return Object.values(BOARD_CONFIG.PIECES.BLACK).includes(piece);
    //     };

    //     for (let rank = 0; rank < 8; rank++) {
    //         for (let file = 0; file < 8; file++) {
    //             const piece = gameState.board[rank][file];

    //             // Skip if square is empty or piece belongs to opponent
    //             if (this.isEmptySquare(piece) || !isPieceBelongsToSide(piece)) {
    //                 continue;
    //             }

    //             // Determine piece type and generate moves accordingly
    //             switch (piece) {
    //                 case BOARD_CONFIG.PIECES.WHITE.PAWN:
    //                 case BOARD_CONFIG.PIECES.BLACK.PAWN:
    //                     moves.push(...this.getPawnMoves(gameState, file, rank));
    //                     break;

    //                 case BOARD_CONFIG.PIECES.WHITE.ROOK:
    //                 case BOARD_CONFIG.PIECES.BLACK.ROOK:
    //                     moves.push(...this.getRookMoves(gameState, file, rank, isWhiteTurn));
    //                     break;

    //                 case BOARD_CONFIG.PIECES.WHITE.KNIGHT:
    //                 case BOARD_CONFIG.PIECES.BLACK.KNIGHT:
    //                     moves.push(...this.getKnightMoves(gameState, file, rank, isWhiteTurn));
    //                     break;

    //                 case BOARD_CONFIG.PIECES.WHITE.BISHOP:
    //                 case BOARD_CONFIG.PIECES.BLACK.BISHOP:
    //                     moves.push(...this.getBishopMoves(gameState, file, rank, isWhiteTurn));
    //                     break;

    //                 case BOARD_CONFIG.PIECES.WHITE.QUEEN:
    //                 case BOARD_CONFIG.PIECES.BLACK.QUEEN:
    //                     // Queen moves combine rook and bishop moves
    //                     moves.push(...this.getRookMoves(gameState, file, rank, isWhiteTurn));
    //                     moves.push(...this.getBishopMoves(gameState, file, rank, isWhiteTurn));
    //                     break;

    //                 case BOARD_CONFIG.PIECES.WHITE.KING:
    //                 case BOARD_CONFIG.PIECES.BLACK.KING:
    //                     moves.push(...this.getKingMoves(gameState, file, rank, isWhiteTurn));
    //                     break;
    //             }
    //         }
    //     }

    //     // Filter out any moves that would result in self-check
    //     const validMoves = moves.filter(move => {
    //         // Create a temporary board copy to test the move
    //         const tempGameState = {
    //             ...gameState,
    //             board: gameState.board.map(row => [...row]),
    //         };

    //         // Make the move on the temporary board
    //         const [fromFile, fromRank, toFile, toRank] = move.split("");
    //         const [fromY, fromX] = this.getSquareFromNotation(fromFile + fromRank, side);
    //         const [toY, toX] = this.getSquareFromNotation(toFile + toRank, side);

    //         tempGameState.board[toY][toX] = tempGameState.board[fromY][fromX];
    //         tempGameState.board[fromY][fromX] =
    //             (fromY + fromX) % 2 === 0 ? BOARD_CONFIG.SQUARES.LIGHT : BOARD_CONFIG.SQUARES.DARK;

    //         // Check if the move would leave the king in check
    //         return !this.isKingInCheck(tempGameState, side);
    //     });

    //     return validMoves;
    // }
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

    // // Helper method to get all possible attacking moves for a side
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

    // async getAiMove(gameState) {
    //     try {
    //         const aiColor = gameState.aiColor;
    //         const validMoves = this.getValidMoves(gameState, aiColor);

    //         // Add logging to debug
    //         console.log("AI color:", aiColor);
    //         console.log("Valid moves:", validMoves);

    //         if (validMoves.length === 0) {
    //             throw new Error("No valid moves available");
    //         }

    //         const aiMessage = {
    //             role: "user",
    //             content: `You are playing chess as ${aiColor}.
    //             Current position (FEN): ${this.boardToFEN(gameState.board)}
    //             Previous moves: ${gameState.moveHistory.join(" ")}
    //             Valid moves: ${validMoves.join(", ")}
    //             Choose one of the valid moves listed above.
    //             Respond with only the move in the format like 'e2e4'.`,
    //         };

    //         let maxAttempts = 5;
    //         let response;
    //         let move;

    //         for (let i = 0; i < maxAttempts; i++) {
    //             response = await this.anthropic.messages.create({
    //                 model: "claude-3-sonnet-20240229",
    //                 max_tokens: 1024,
    //                 messages: [aiMessage],
    //             });

    //             console.log("AI response:", response);

    //             move = response.content[0].text.trim();

    //             if (!validMoves.includes(move)) {
    //                 console.log(`AI suggested invalid move: ${move}`);
    //             } else {
    //                 break;
    //             }
    //         }

    //         if (!move || !validMoves.includes(move)) {
    //             throw new Error("Failed to generate a valid move");
    //         }

    //         return move;
    //     } catch (error) {
    //         console.error("AI move error:", error);
    //         const validMoves = this.getValidMoves(gameState, gameState.aiColor);
    //         return validMoves[Math.floor(Math.random() * validMoves.length)];
    //     }
    // }

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
            "♔": "K",
            "♕": "Q",
            "♖": "R",
            "♗": "B",
            "♘": "N",
            "♙": "P",
            "♚": "k",
            "♛": "q",
            "♜": "r",
            "♝": "b",
            "♞": "n",
            "♟": "p",
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
        const turnColor = gameState.isPlayerTurn ? gameState.playerColor : gameState.aiColor;
        const direction = isWhiteTurn ? -1 : 1;
        const startRank = isWhiteTurn ? 6 : 1;

        // Forward move
        const newRank = rank + direction;
        if (newRank >= 0 && newRank < 8) {
            // Single step forward
            if (this.isEmptySquare(gameState.board[newRank][file])) {
                moves.push(
                    this.getNotationFromSquare(rank, file, turnColor) +
                        this.getNotationFromSquare(newRank, file, turnColor)
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
                            this.getNotationFromSquare(rank, file, turnColor) +
                                this.getNotationFromSquare(doubleRank, file, turnColor)
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
                            this.getNotationFromSquare(rank, file, turnColor) +
                                this.getNotationFromSquare(newRank, newFile, turnColor)
                        );
                    }
                }
            }
        }

        return moves;
    }

    // chunkArray(array, size) {
    //     return array.reduce((chunks, item, index) => {
    //         const chunkIndex = Math.floor(index / size);
    //         if (!chunks[chunkIndex]) chunks[chunkIndex] = [];
    //         chunks[chunkIndex].push(item);
    //         return chunks;
    //     }, []);
    // }

    // isEmptySquare(piece) {
    //     return piece === BOARD_CONFIG.SQUARES.LIGHT || piece === BOARD_CONFIG.SQUARES.DARK;
    // }

    // isWhitePiece(piece) {
    //     return ["♔", "♕", "♖", "♗", "♘", "♙"].includes(piece);
    // }

    // isBlackPiece(piece) {
    //     return ["♚", "♛", "♜", "♝", "♞", "♟"].includes(piece);
    // }
}
