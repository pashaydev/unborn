import crypto from "crypto";
import { getBucket } from "../storage";
import { Database } from "bun:sqlite";
import { DatabaseManager } from "./db";
import fs from "fs";

class DatabaseSaver {
    /**
     * @param {Database}
     * @private
     */
    #db;
    /**
     * @param {number} interval
     * @private
     */
    #interval = 1000 * 60 * 60; // 1 hour
    /**
     * @param {string} id
     * @private
     */
    id;
    /**
     * @param {Storage} bucket
     * @private
     */
    #bucket;

    /**
     * @param {number} rafId
     * @private
     */
    #rafId;

    /**
     * @param {Database} db
     */
    constructor(db) {
        this.#bucket = getBucket();
        this.id = new Date().toISOString().replace(/T/, ":").replace(/\..+/, "").replace(/:/g, ".");
        this.startSaving();

        this.#db = db;
    }
    startSaving() {
        if (this.#rafId) {
            clearInterval(this.#rafId);
        }

        this.#rafId = setInterval(async () => {
            try {
                const dbPath = DatabaseManager.determineDbPath();

                // Verify the path exists and is a file
                const stats = await fs.promises.stat(dbPath);
                if (!stats.isFile()) {
                    throw new Error(`Path is not a file: ${dbPath}`);
                }

                // Read the file directly using fs
                const buffer = await fs.promises.readFile(dbPath);

                const tempFilePath = `/tmp/db-${this.id}.sqlite`;
                await fs.promises.writeFile(tempFilePath, buffer);

                await this.#bucket.upload(tempFilePath, {
                    destination: `backups/${Bun.env.NODE_ENV || "development"}-db-${
                        this.id
                    }.sqlite`,
                });
                console.log("Saved database to GCS");
            } catch (error) {
                console.error("Failed to save database to GCS:", error);
            }
        }, this.#interval);
    }

    destory() {
        clearInterval(this.#rafId);
    }

    /**
     * @description Restores the database from the latest backup in the bucket
     */
    static async restoreDatabase() {
        const dbPath = DatabaseManager.determineDbPath();
        const tempFilePath = `/tmp/db-${new Date()
            .toISOString()
            .replace(/T/, ":")
            .replace(/\..+/, "")
            .replace(/:/g, ".")}.sqlite`;

        try {
            const bucket = getBucket();

            // Get the list of files in the backups folder
            const [files] = await bucket.getFiles({
                prefix: `backups/${Bun.env.NODE_ENV || "development"}-db-`,
                delimiter: "/",
            });

            // Sort files by name in descending order to get the latest file
            files.sort((a, b) => b.name.localeCompare(a.name));

            if (files.length === 0) {
                console.log("No backups found in GCS");
            } else {
                // Download the latest file
                const buffer = await files[0].download();
                await fs.promises.writeFile(tempFilePath, buffer[0]);
                await fs.promises.copyFile(tempFilePath, dbPath);

                console.log("Restored database from GCS");
            }
        } catch (error) {
            console.error("Failed to restore database from GCS:", error);
        }
    }
}

export default DatabaseSaver;
