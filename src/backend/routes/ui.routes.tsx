import { Html } from "@elysiajs/html";
import { Elysia } from "elysia";
import type Anthropic from "@anthropic-ai/sdk";
import type OpenAI from "openai";
import { swagger } from "@elysiajs/swagger";
import UserManager from "../../user-manager.js";

export const createUiRotes = (deps: {
    anthropic: Anthropic;
    openai: OpenAI;
    userManager: UserManager;
}) =>
    new Elysia()
        .use(
            swagger({
                documentation: {
                    info: {
                        title: "Search API Documentation",
                        version: "1.0.0",
                        description: "API for performing regular and deep searches",
                    },
                    tags: [
                        { name: "UI", description: "User interface endpoints" },
                        { name: "Search", description: "Search functionality endpoints" },
                    ],
                    security: [{ bearerAuth: [] }],
                },
            })
        )
        .get(
            "ui",
            async () => {
                return (
                    <html lang="en">
                        <head>
                            <title>Scrapper</title>
                            <meta name="theme-color" content="#0f172a"></meta>
                            <meta name="color-scheme" content="dark"></meta>
                            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                            <link rel="stylesheet" href="public/main.css"></link>
                            <link rel="icon" href="public/favicon.svg" type="image/x-icon" />
                        </head>

                        <body>
                            <div id="root"></div>
                            <script defer src="public/client.js" />
                        </body>
                    </html>
                );
            },
            {
                detail: {
                    tags: ["UI"],
                    summary: "Main application UI",
                    description: "Returns the main application user interface",
                },
            }
        )
        .get(
            "ui/login",
            async () => {
                return (
                    <html lang="en">
                        <head>
                            <title>Authentication</title>
                            <meta name="theme-color" content="#0f172a"></meta>
                            <meta name="color-scheme" content="dark"></meta>
                            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                            <link rel="stylesheet" href="../public/main.css"></link>
                            <link rel="icon" href="../public/favicon.svg" type="image/x-icon" />
                        </head>
                        <body>
                            <div id="root"></div>
                            <script src="../public/client.js" />
                        </body>
                    </html>
                );
            },
            {
                detail: {
                    tags: ["UI"],
                    summary: "Login page",
                    description: "Returns the authentication page interface",
                },
            }
        );
