import fs from "fs";
import getClient from "./supabase.js";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "../../database.types.js";

export class DatabaseManager {
    dbPath: string;
    dbDir: string;
    db: SupabaseClient<Database> | null;

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

        return pathMap[Bun.env.NODE_ENV!] || "db.sqlite";
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

    async initialize(): Promise<SupabaseClient | undefined> {
        try {
            const db = getClient();

            if (db) this.db = db;

            return db;
        } catch (err) {
            console.log(err);
        }
    }

    async getDatabase(): Promise<SupabaseClient | undefined> {
        if (!this.db) {
            const db = await this.initialize();
            return db;
        }
        return this.db;
    }

    close() {
        if (this.db) {
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
        if (!db) {
            return console.error("Database is not available");
        }
        const data = await db.from("history").insert({
            user_input: userInput,
            bot_response: botResponse,
            user_id: userId,
        });

        console.log("History saved to database", data);
    } catch (err) {
        console.log(err);
    }
};

export const saveHistory = async (args: {
    userInput: string;
    botResponse: string;
    userId: string;
}) => await insertHistory(args);
