declare const self: Worker;

// If you need to import modules, use the standard ES module syntax
import * as ds from "../bots/discord-bot.js";

// Remove the Node.js import and use Deno's self
self.onmessage = ({ data }) => {
    const type = data.type;
    if (type === "healthCheck") {
        self.postMessage({ type: "healthCheckResponse", status: "healthy" });
        return;
    }
    if (type === "start") {
        // Add your start logic here
        ds.startDiscordBot();
    }
};

self.onerror = (error: ErrorEvent) => {
    console.error("Worker error:", error);
    self.postMessage({
        status: "error",
        error: error.message,
    });
};
