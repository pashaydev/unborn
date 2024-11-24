import fs from "fs";
import getClient from "./supabase.js";

export class DatabaseManager {
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

    async initialize() {
        try {
            return getClient();
        } catch (err) {
            console.log(err);
        }
    }

    /**
     *
     * @returns {Promise<import("@supabase/supabase-js").SupabaseClient>}
     */
    async getDatabase() {
        if (!this.db) {
            return await this.initialize();
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

export const insertHistory = async ({ userInput, botResponse, userId }) => {
    // Get database instance
    try {
        console.log("Inserting history to database", { userInput, botResponse, userId });
        const db = await databaseManager.getDatabase();
        const data = await db.from("history").insert({
            user_input: userInput,
            bot_response: botResponse,
            user_id: userId,
        });

        // console.log("DB", data, error);
        console.log("History saved to database", data);
        // return data;
    } catch (err) {
        console.log(err);
    }
};

/**
 * Saves interaction history to database
 * @param {Object} args - History entry parameters
 * @param {number} args.userId - Telegram user ID
 * @param {string} args.userInput - User's input
 * @param {string} args.telegramBotResponse - Bot's response
 */
export const saveHistory = async args => await insertHistory(args);
