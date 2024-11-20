import { getBucket } from "../storage.js";
import { DatabaseManager } from "./db.js";
import fs from "node:fs";
import cron from "node-cron";

class DatabaseSaver {
    /**
     * @type {DatabaseManager}
     */
    #dbManager;
    /**
     * @type {number} interval
     * @private
     */

    id;
    /**
     * @param {Storage} bucket
     * @private
     */
    #bucket;

    /**
     * @type {import("node-cron").ScheduledTask}
     */
    #task;

    /**
     * @param {DatabaseManager} dbManager
     */
    constructor(dbManager) {
        this.#bucket = getBucket();
        this.id = new Date().toISOString().replace(/T/, ":").replace(/\..+/, "").replace(/:/g, ".");
        this.startSaving();

        this.#dbManager = dbManager;
    }
    startSaving() {
        this.#task = cron.schedule("0 * * * *", async () => {
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
                    destination: `backups/${Deno.env.get("NODE_ENV") || "development"}-db-${
                        this.id
                    }.sqlite`,
                });
                console.log("Saved database to GCS, file name: ", tempFilePath);
            } catch (error) {
                console.error("Failed to save database to GCS:", error);
            }
        });
    }

    destory() {
        if (this.#task) {
            this.#task.removeAllListeners();
        }
    }

    /**
     * @description Restores the database from the latest backup in the bucket
     */
    static async restoreDatabase() {
        console.log("Restoring database from GCS...");

        const dbPath = DatabaseManager.determineDbPath();
        const tempFilePath = `db.sqlite`;

        try {
            const bucket = getBucket();

            // Get the list of files in the backups folder
            const [files] = await bucket.getFiles({
                prefix: `backups/${Deno.env.get("NODE_ENV") || "development"}-db-`,
                delimiter: "/",
            });

            // Sort files by name in descending order to get the latest file
            files.sort((a, b) => {
                const aParsedTime = a.name.match(
                    /backups\/.*-(\d{4}-\d{2}-\d{2}\.\d{2}\.\d{2}\.\d{2})\.sqlite/
                );
                const bParsedTime = b.name.match(
                    /backups\/.*-(\d{4}-\d{2}-\d{2}\.\d{2}\.\d{2}\.\d{2})\.sqlite/
                );

                if (!aParsedTime || !bParsedTime) {
                    return 0;
                }

                const aTime = new Date(aParsedTime[1]);
                const bTime = new Date(bParsedTime[1]);

                return aTime > bTime ? -1 : aTime < bTime ? 1 : 0;
            });

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
