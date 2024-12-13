import { Elysia, t } from "elysia";
import ScrapperHandler from "../../actions/scrapper";
import type Anthropic from "@anthropic-ai/sdk";
import type OpenAI from "openai";
import type UserManager from "../../user-manager";
import { databaseManager } from "../../database/db";
import axios from "axios";

const handleSearch = async ({ query, deps, isDeep = false, user, error }) => {
    const { q } = query;

    console.log(user, "user", q, "search");

    if (!q) {
        return error("Search query is required");
    }

    const scrapper = new ScrapperHandler({
        ...deps,
        sendMenu: () => {},
    });

    return scrapper.handleSearch(q, isDeep, user, error);
};

export const scrapperRoutes = (deps: {
    anthropic: Anthropic;
    openai: OpenAI;
    userManager: UserManager;
}) =>
    new Elysia()
        .get(
            "/api/search",
            async ({ query, authenticate, error }) => {
                let user, interaction;
                try {
                    user = await authenticate();

                    console.log("User: ", user);

                    const db = await databaseManager.getDatabase();
                    const { data, error } = await db
                        .from("interactions")
                        .select("*")
                        .eq("user_id", user.user_id)
                        .eq("action_name", "scrapper")
                        .order("id", { ascending: false });

                    if (error) {
                        console.error(error);
                    }

                    interaction = data?.[0];
                } catch (err) {
                    return error(401, "Not authorize");
                }

                console.log("Search interaction: ", interaction, interaction?.length);

                if (interaction && interaction?.count > 5) {
                    return error(429, "InteractionLimit");
                }

                const results = await handleSearch({ query, deps, user, error });

                try {
                    const db = await databaseManager.getDatabase();
                    await db.from("scrapper_results").insert({
                        user_id: user?.user_id,
                        results,
                        query: query.q,
                        action_name: "scrapper",
                    });
                } catch (err) {
                    console.error(err);
                }

                return results;
            },
            {
                query: t.Object({
                    q: t.String({
                        description: "Search query string",
                        example: "search term",
                    }),
                }),
                detail: {
                    summary: "Search across multiple engines with AI formatting",
                    tags: ["Web Scrapping"],
                    responses: {
                        200: {
                            description: "Successful search results",
                        },
                        401: {
                            description: "Unauthorized - Authentication required",
                        },
                        400: {
                            description: "Bad Request - Invalid query parameter",
                        },
                    },
                },
            }
        )
        .get(
            "/api/deep-search",
            async ({ query, authenticate, error }) => {
                let user, interaction;
                try {
                    user = await authenticate();

                    console.log("User: ", user);

                    const db = await databaseManager.getDatabase();
                    const { data, error } = await db
                        .from("interactions")
                        .select("*")
                        .eq("user_id", user.user_id)
                        .eq("action_name", "scrapperrecursive")
                        .order("id", { ascending: false });

                    if (error) {
                        console.error(error);
                    }

                    interaction = data?.[0];
                } catch (err) {
                    return error(401, "Not authorize");
                }

                console.log("Search interaction: ", interaction, interaction?.length);

                if (interaction && interaction?.count > 5) {
                    return error(429, "InteractionLimit");
                }

                const result = await handleSearch({ query, deps, isDeep: true, user, error });

                try {
                    const db = await databaseManager.getDatabase();
                    await db.from("scrapper_results").insert({
                        user_id: user?.user_id,
                        results: result,
                        query: query.q,
                        action_name: "scrapperrecursive",
                    });
                } catch (err) {
                    console.error(err);
                }

                return result;
            },
            {
                query: t.Object({
                    q: t.String({
                        description: "Deep search query string",
                        example: "detailed search term",
                    }),
                }),
                detail: {
                    summary: "Recursive search with AI processing",
                    tags: ["Web Scrapping"],
                    responses: {
                        200: {
                            description: "Successful deep search results",
                        },
                        401: {
                            description: "Unauthorized - Authentication required",
                        },
                        400: {
                            description: "Bad Request - Invalid query parameter",
                        },
                    },
                },
            }
        )
        .get(
            "/api/search-history",
            async ({ authenticate, error }) => {
                try {
                    let user = await authenticate();
                    const db = await databaseManager.getDatabase();
                    const { data, error: dbErr } = await db
                        .from("scrapper_results")
                        .select("*")
                        .eq("user_id", user.user_id);

                    if (dbErr) return error(500, dbErr.message);

                    return data;
                } catch (err) {
                    return error(401, "Not authorize");
                }
            },
            {
                detail: {
                    summary: "Search history for user",
                    tags: ["Web Scrapping"],
                },
            }
        )
        .get("/api/suggestions", async ({ error, query }) => {
            try {
                const searchTerm = query.q;
                const response = await axios.get(
                    `http://suggestqueries.google.com/complete/search?output=toolbar&hl=en&q=${searchTerm}&gl=uk`
                );
                return response.data;
            } catch (error) {
                return error(500, "Failed to fetch suggestions");
            }
        });
