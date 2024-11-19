import { parentPort } from "worker_threads";
import startDiscordBot from "../bots/discord-bot.js";

parentPort.onmessage = ({ data }) => {
    const type = data.type;
    if (type === "healthCheck") {
        self.postMessage({ type: "healthCheckResponse", status: "healthy" });
        return;
    }
    if (type === "start") {
        startDiscordBot(data);
    }
};
