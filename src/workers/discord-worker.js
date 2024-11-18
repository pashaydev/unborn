import { parentPort } from "worker_threads";
import startDiscordBot from "../bots/discord-bot.js";

parentPort.onmessage = ({ data }) => {
    // console.log("Discord worker data:", data);
    const type = data.type;
    if (type === "start") {
        startDiscordBot(data);
    }
};
