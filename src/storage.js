// Imports the Google Cloud client library
import { Storage } from "@google-cloud/storage";

// For more information on ways to initialize Storage, please see
// https://googleapis.dev/nodejs/storage/latest/Storage.html

// Creates a client from a Google service account key
const parsedGSKey = JSON.parse(Bun.env.GCS_KEY_FILE);
const storage = new Storage({
    projectId: parsedGSKey.project_id,
    credentials: parsedGSKey,
});

// The ID of your GCS bucket
const bucketName = Bun.env.GCS_BUCKET_NAME;

export const getBucket = () => {
    return storage.bucket(bucketName);
};
