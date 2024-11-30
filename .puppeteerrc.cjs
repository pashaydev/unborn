const { join } = require("path");
const { existsSync, mkdirSync } = require("fs");

const cacheDir = join(process.cwd(), ".cache", "puppeteer");
if (!existsSync(cacheDir)) {
    mkdirSync(cacheDir, { recursive: true });
}

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
    // Download Chrome (default `skipDownload: false`).
    chrome: {
        skipDownload: false,
    },
    // Set cache directory relative to project root
    cacheDirectory: cacheDir,
    executablePath: Bun?.env?.CHROME_BIN || null,
    // Add additional browser launch arguments if needed
    browserLaunchArgs: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--no-first-run",
        "--no-zygote",
        "--single-process",
        "--disable-extensions",
    ],
    ignoreDefaultArgs: ["--enable-automation"],
};
