import { Database } from "bun:sqlite";
import fs from "fs";

// Define the database directory - use /data for Fly.io persistent volume
let dbDir = "";

if (process.env.NODE_ENV === "production") {
    dbDir = "/data";
}
if (!process.env.NODE_ENV) {
    dbDir = "./data";
}

const getDbPath = () => {
    switch (process.env.NODE_ENV) {
        case "production":
            return "/data/db.sqlite";
        case "test":
            return ":memory:"; // Use in-memory database for tests
        default:
            return "db.sqlite";
    }
};

export const HISTORY_INSERT_QUERY =
    "INSERT INTO history (user_id, user_input, bot_response) VALUES (?, ?, ?)";
export const DB_CREATION_QUERY =
    "CREATE TABLE IF NOT EXISTS history (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, user_input TEXT, bot_response TEXT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)";

const dbPath = getDbPath();
console.log(`Using database at ${dbPath}`);

// Ensure database directory exists
function initializeDatabase() {
    // Create directory if it doesn't exist
    if (dbDir && !fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }

    const db = new Database(dbPath, err => {
        if (err) {
            console.error("Database creation error:", err);
            throw err;
        }
    });

    // Create tables
    db.exec(`
        CREATE TABLE IF NOT EXISTS history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            user_input TEXT,
            bot_response TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    return db;
}

export const db = initializeDatabase();

db.query(DB_CREATION_QUERY).run();

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
