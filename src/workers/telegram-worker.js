import { parentPort } from "worker_threads";
import startTelegramBot from "../bots/telegram-bot.js";

parentPort.onmessage = ({ data }) => {
    const type = data.type;

    if (type === "healthCheck") {
        self.postMessage({ type: "healthCheckResponse", status: "healthy" });
        return;
    }
    if (type === "start") {
        startTelegramBot(data);
    }
};
