import { Client, Events, GatewayIntentBits, Partials, REST } from "discord.js";
import { parentPort } from "node:worker_threads";
import ActionManager from "../actions/actions-manager.js";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import UserManager from "../user-manager.js";

export const startDiscordBot = config => {
    const parsedConfig = config;

    const { DISCORD_BOT_TOKEN, ANTHROPIC_API_KEY, OPENAI_API_KEY } = parsedConfig;

    const discordBot = new Client({
        intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
        partials: [Partials.Channel],
    });

    const anthropic = new Anthropic({
        apiKey: ANTHROPIC_API_KEY,
    });

    const openai = new OpenAI({
        apiKey: OPENAI_API_KEY,
    });

    const userManager = new UserManager();

    const actionManager = new ActionManager({
        discordBot,
        openai,
        anthropic,
        userManager,
        sendMenu: () => {},
    });

    const discordRest = new REST({ version: "10" }).setToken(DISCORD_BOT_TOKEN);
    discordBot.rest = discordRest;

    console.log("Discord bot starting...", userManager);

    discordBot.on(Events.ClientReady, () => {
        console.log(`Logged in as ${discordBot.user.tag}!`);
        actionManager.registerDiscordCommands();
        parentPort?.postMessage({ type: "ready", bot: "discord" });
    });

    // Start the Discord bot
    discordBot.login(DISCORD_BOT_TOKEN).catch(error => {
        console.error("Discord bot error:", error);
        parentPort?.postMessage({ type: "error", bot: "discord", error: error.message });
    });

    return discordBot;
};
