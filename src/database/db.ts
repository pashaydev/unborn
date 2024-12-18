import fs from "fs";
import getClient from "./supabase.js";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "../../database.types.js";
import { Context, Telegraf } from "telegraf";

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

    async getDatabase(): Promise<SupabaseClient<Database> | undefined> {
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

export const updateTokensTracking = async (ctx: Context, rephrasedRes: any, actionName: string) => {
    let existingData;
    try {
        const userId = ctx.from?.id;
        const db = await databaseManager.getDatabase();

        if (!db) {
            throw new Error("Error getting db");
        }

        const { data: eData, error: iErr } = await db
            .from("interactions")
            .select("*")
            .eq("action_name", actionName)
            .eq("user_id", userId);

        existingData = eData?.at(-1);

        console.log("Existing interaction: ", existingData);

        if (iErr) {
            console.log("Error getting interactions: ", iErr);
        }
    } catch (err) {
        console.error(err);
    }

    try {
        const userId = ctx.from?.id;
        const db = await databaseManager.getDatabase();

        if (!db) {
            throw new Error("Error getting db");
        }

        const commandCount = existingData?.count || 1;

        const { data: dataUpdate, error } = await db
            .from("interactions")
            .upsert({
                user_id: userId,
                count: commandCount + 1,
                action_name: actionName,
                tokens:
                    (rephrasedRes?.usage?.input_tokens || 0) +
                    (rephrasedRes?.usage?.output_tokens || 0),
            })
            .eq("user_id", userId)
            .eq("action_name", actionName);

        if (dataUpdate) console.log("Update user: ", dataUpdate);
        if (error) console.log("Error update user: ", error);
    } catch (err) {
        console.log(err);
    }
};
