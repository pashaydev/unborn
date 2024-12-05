import { Elysia, t } from "elysia";
import ScrapperHandler from "../../actions/scrapper";
import type Anthropic from "@anthropic-ai/sdk";
import type OpenAI from "openai";
import type UserManager from "../../user-manager";

export const scrapperRoutes = (deps: {
    anthropic: Anthropic;
    openai: OpenAI;
    userManager: UserManager;
}) =>
    new Elysia()
        .get(
            "recursive-scrapping",
            async ({ query: { query }, authenticate }) => {
                await authenticate();

                const scrapper = new ScrapperHandler({
                    ...deps,
                    sendMenu: () => {},
                });
                return await scrapper.handleSearch(query, true);
            },
            {
                query: t.Object({
                    query: t.String({
                        minLength: 8,
                        description: "Search query what will be used by search engine",
                    }),
                }),
                detail: {
                    summary: "Recursive search with AI processing",
                    tags: ["Web Scrapping"],
                },
            }
        )
        .get(
            "scrapping",
            async ({ query: { query }, authenticate }) => {
                const user = await authenticate();

                const scrapper = new ScrapperHandler({
                    ...deps,
                    sendMenu: () => {},
                });
                return await scrapper.handleSearch(query, false, user);
            },
            {
                query: t.Object({
                    query: t.String({
                        minLength: 8,
                        description: "Search query what will be used by search engines",
                    }),
                }),
                detail: {
                    summary: "Search across multiple engines with AI formatting",
                    tags: ["Web Scrapping"],
                },
            }
        );
