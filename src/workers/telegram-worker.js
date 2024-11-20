import startTelegramBot from "../bots/telegram-bot.js";
import { parentPort } from "node:worker_threads";

parentPort.onmessage = ({ data }) => {
    const type = data.type;

    if (type === "healthCheck") {
        parentPort.postMessage({ type: "healthCheckResponse", status: "healthy" });
        return;
    }
    if (type === "start") {
        startTelegramBot(data);
    }
};
