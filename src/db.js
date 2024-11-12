import { Database } from "bun:sqlite";

export const HISTORY_INSERT_QUERY =
    "INSERT INTO history (user_id, user_input, bot_response) VALUES (?, ?, ?)";
export const DB_CREATION_QUERY =
    "CREATE TABLE IF NOT EXISTS history (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, user_input TEXT, bot_response TEXT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)";

export const db = new Database("db.sqlite");
db.query(DB_CREATION_QUERY);

export const insertHistory = ({ userInput, botResponse, userId }, db) => {
    db.query(HISTORY_INSERT_QUERY).run(...[userId, userInput, botResponse]);

    const items = db.query("SELECT * FROM history").all();
    console.log(items, "Items in the database");
};

/**
 * Saves interaction history to database
 * @param {Object} args - History entry parameters
 * @param {number} args.userId - Telegram user ID
 * @param {string} args.userInput - User's input
 * @param {string} args.botResponse - Bot's response
 */
export const saveHistory = args => insertHistory(args, db);
