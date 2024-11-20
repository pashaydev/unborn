// Imports the Google Cloud client library
import { Storage } from "@google-cloud/storage";

// For more information on ways to initialize Storage, please see
// https://googleapis.dev/nodejs/storage/latest/Storage.html

export const getBucket = () => {
    // Creates a client from a Google service account key

    // The ID of your GCS bucket
    const bucketName = Deno.env.get("GCS_BUCKET_NAME");
    const parsedGSKey = JSON.parse(Deno.env.get("GCS_KEY_FILE") || "{}");

    if (bucketName && parsedGSKey) {
        const storage = new Storage({
            projectId: parsedGSKey.project_id,
            credentials: parsedGSKey,
        });

        try {
            return storage.bucket(bucketName);
        } catch (err) {
            console.error(err);
        }
    } else {
        console.warn("envs issue with storage");
    }

    return null;
};
