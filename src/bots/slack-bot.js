import { parentPort } from "worker_threads";
import { App } from "@slack/bolt";
import UserManager from "../user-manager";
import ActionManager from "../actions/actions-manager";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

export default async function startSlackBot(config) {
    try {
        const parsedConfig = config;

        const { ANTHROPIC_API_KEY, OPENAI_API_KEY } = parsedConfig;

        const slackBot = new App({
            botId: Bun.env.SLACK_BOT_ID,
            token: Bun.env.SLACK_BOT_OAUTH_TOKEN,
            signingSecret: Bun.env.SLACK_SIGNING_SECRET,
            socketMode: true,
            appToken: Bun.env.SLACK_APP_TOKEN,

            customRoutes: [],
            retryConfig: {
                retries: 2,
                factor: 2,
                randomize: true,
            },

            developerMode: true,
        });

        const anthropic = new Anthropic({
            apiKey: ANTHROPIC_API_KEY,
        });

        const openai = new OpenAI({
            apiKey: OPENAI_API_KEY,
        });

        const userManager = new UserManager();

        const actionManager = new ActionManager({
            slackBot,
            openai,
            anthropic,
            userManager,
            sendMenu: () => {},
        });

        await actionManager.registerSlackCommands();

        // Start the app
        (async () => {
            try {
                await slackBot.start();
                console.log("⚡️ Bolt app is running!");
            } catch (error) {
                console.error("Failed to start Slack app:", error);
                process.exit(1);
            }
        })();

        // Add error handler
        slackBot.error(async error => {
            console.error("Slack Error:", error);
        });

        parentPort?.postMessage({ type: "ready", bot: "slack" });

        return slackBot;
    } catch (error) {
        console.error("Slack bot error:", error);
        parentPort?.postMessage({ type: "error", bot: "slack", error: error.message });
    }
}
