import { Database } from "bun:sqlite";
import fs from "fs";
import DatabaseSaver from "./db-saver";

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
        this.dbPath = DatabaseManager.determineDbPath();
        this.dbDir = DatabaseManager.determineDbDir();
        this.db = null;
    }

    static determineDbPath() {
        const pathMap = {
            production: "/data/db.sqlite",
            test: ":memory:",
            development: "db.sqlite",
        };

        return pathMap[Bun.env.NODE_ENV] || "db.sqlite";
    }

    static determineDbDir() {
        if (Bun.env.NODE_ENV === "production") {
            return "/data";
        }
        return Bun.env.NODE_ENV ? "" : "./data";
    }

    ensureDirectoryExists() {
        if (this.dbDir && !fs.existsSync(this.dbDir)) {
            fs.mkdirSync(this.dbDir, { recursive: true });
        }
    }

    async addRootUser() {
        const db = await this.getDatabase();
        const rootUser = db.prepare("SELECT * FROM users WHERE user_id = ?").get(634587551);

        if (!rootUser) {
            db.query("INSERT INTO users (user_id, username, access_level) VALUES (?, ?, ?)").run(
                634587551,
                "root",
                1
            );
            console.log("Root user added.");
        } else {
            console.log("Root user already exists.");
        }
    }

    async initialize() {
        try {
            this.ensureDirectoryExists();

            console.log("Initializing database...", this.dbPath);

            if (Bun.env.NODE_ENV !== "test") {
                // Restore database from Google Cloud Storage
                await DatabaseSaver.restoreDatabase();
            }

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
            // this.addRootUser();

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

export const insertHistory = async ({ userInput, botResponse, userId }) => {
    // Get database instance
    const db = await databaseManager.getDatabase();
    // Use SQL queries
    db.query(SQL_QUERIES.INSERT_HISTORY).run(userId, userInput || "", botResponse || "");
    console.log("History saved to database", { userInput, botResponse, userId });
};

export const addNewUser = async ({ userId, username }) => {
    const db = await databaseManager.getDatabase();
    db.query("INSERT INTO users (user_id, username) VALUES (?, ?)").run(userId, username);
    console.log("New user added to database", { userId, username });
};

export const getHistory = async ({ userId }) => {
    const db = await databaseManager.getDatabase();

    const rows = db.prepare("SELECT * FROM history WHERE user_id = ?").all(userId);

    console.log("Get history", rows);

    return rows;
};

/**
 * Saves interaction history to database
 * @param {Object} args - History entry parameters
 * @param {number} args.userId - Telegram user ID
 * @param {string} args.userInput - User's input
 * @param {string} args.telegramBotResponse - Bot's response
 */
export const saveHistory = async args => await insertHistory(args);
