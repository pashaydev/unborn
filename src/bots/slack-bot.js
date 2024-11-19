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
            // token: Bun.env.SLACK_BOT_OAUTH_TOKEN, // Bot User OAuth Token
            // signingSecret: Bun.env.SLACK_SIGNING_SECRET, // Signing Secret
            // socketMode: true,
            // appToken: Bun.env.SLACK_APP_TOKEN, // App-Level Token (xapp-...)

            token: process.env.SLACK_BOT_OAUTH_TOKEN,
            signingSecret: process.env.SLACK_SIGNING_SECRET,
            socketMode: true,
            appToken: process.env.SLACK_APP_TOKEN,

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

        // Add specific command handler for /ghostwriter
        // slackBot.command("/ghostwriter", async ({ command, ack, say }) => {
        //     // Always acknowledge the command first
        //     await ack();

        //     try {
        //         // Handle the command
        //         console.log("Handling /ghostwriter command");
        //     } catch (error) {
        //         console.error("Error processing command:", error);
        //     }
        // });

        console.log("Slack bot starting...");
        // Start your app
        // slackBot.start(config.PORT || 3000);

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

        console.log("⚡️ Bolt app is running!");

        parentPort?.postMessage({ type: "ready", bot: "slack" });

        return slackBot;
    } catch (error) {
        console.error("Slack bot error:", error);
        parentPort?.postMessage({ type: "error", bot: "slack", error: error.message });
    }
}
