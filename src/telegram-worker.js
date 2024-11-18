import { parentPort } from "worker_threads";
import startTelegramBot from "./telegram-bot.js";

parentPort.onmessage = ({ data }) => {
    // console.log("Telegram worker data:", data);

    const type = data.type;
    if (type === "start") {
        startTelegramBot(data);
    }
};
