import { Database } from "bun:sqlite";
import fs from "fs";

export class DatabaseManager {
    static SQL_QUERIES = {
        CREATE_HISTORY_TABLE: `
            CREATE TABLE IF NOT EXISTS history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                user_input TEXT,
                bot_response TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `,
        CREATE_USER_TABLE: `
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                username TEXT,
                access_level INTEGER DEFAULT 0,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            `,
        INSERT_HISTORY: "INSERT INTO history (user_id, user_input, bot_response) VALUES (?, ?, ?)",
    };

    constructor() {
        this.dbPath = this.determineDbPath();
        this.dbDir = this.determineDbDir();
        this.db = null;
    }

    determineDbPath() {
        const pathMap = {
            production: "/data/db.sqlite",
            test: ":memory:",
            development: "db.sqlite",
        };

        return pathMap[process.env.NODE_ENV] || "db.sqlite";
    }

    determineDbDir() {
        if (process.env.NODE_ENV === "production") {
            return "/data";
        }
        return process.env.NODE_ENV ? "" : "./data";
    }

    ensureDirectoryExists() {
        if (this.dbDir && !fs.existsSync(this.dbDir)) {
            fs.mkdirSync(this.dbDir, { recursive: true });
        }
    }

    addRootUser() {
        const db = this.getDatabase();
        db.query("INSERT INTO users (user_id, username, access_level) VALUES (?, ?, ?)").run(
            634587551,
            "root",
            1
        );
    }

    initialize() {
        try {
            this.ensureDirectoryExists();

            console.log("Initializing database...", this.dbPath);

            this.db = new Database(this.dbPath, {
                verbose: console.log,
                readwrite: true,
                create: true,
            });

            // Check if history table exists
            const tableExists = this.db
                .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='history'")
                .get();

            if (!tableExists) {
                // Create the table
                this.db.exec(SQL_QUERIES.CREATE_HISTORY_TABLE);
            }

            // Check if users table exists
            const usersTableExists = this.db
                .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
                .get();

            if (!usersTableExists) {
                // Create the table
                this.db.exec(SQL_QUERIES.CREATE_USER_TABLE);
            }

            // Add root user
            this.addRootUser();

            console.log(`Database initialized successfully at ${this.dbPath}`);
            return this.db;
        } catch (error) {
            console.error("Failed to initialize database:", error);
            throw error;
        }
    }

    getDatabase() {
        if (!this.db) {
            return this.initialize();
        }
        return this.db;
    }

    close() {
        if (this.db) {
            this.db.close();
            this.db = null;
        }
    }
}

// Export singleton instance
export const databaseManager = new DatabaseManager();

// Export SQL queries for external use
export const { SQL_QUERIES } = DatabaseManager;

export const insertHistory = ({ userInput, botResponse, userId }) => {
    // Get database instance
    const db = databaseManager.getDatabase();

    // Use SQL queries
    db.query(SQL_QUERIES.INSERT_HISTORY).run(userId, userInput || "", botResponse || "");

    console.log("Add new items to db", userInput, botResponse, userId);
};

export const addNewUser = ({ userId, username }) => {
    const db = databaseManager.getDatabase();
    db.query("INSERT INTO users (user_id, username) VALUES (?, ?)").run(userId, username);
    console.log("Add new user to db", userId, username);
};

export const getHistory = ({ userId }) => {
    const db = databaseManager.getDatabase();

    const rows = db.prepare("SELECT * FROM history WHERE user_id = ?").all(userId);

    console.log("Get history", rows);

    return rows;
};

/**
 * Saves interaction history to database
 * @param {Object} args - History entry parameters
 * @param {number} args.userId - Telegram user ID
 * @param {string} args.userInput - User's input
 * @param {string} args.botResponse - Bot's response
 */
export const saveHistory = args => insertHistory(args);
