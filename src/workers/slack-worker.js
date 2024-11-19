import { parentPort } from "worker_threads";
import startSlackBot from "../bots/slack-bot.js";

parentPort.onmessage = ({ data }) => {
    const type = data.type;
    if (type === "healthCheck") {
        self.postMessage({ type: "healthCheckResponse", status: "healthy" });
        return;
    }
    if (type === "start") {
        console.log("Starting Slack bot...");
        startSlackBot(data);
    }
};
