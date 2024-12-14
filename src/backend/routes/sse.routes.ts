import Elysia, { t } from "elysia";
import { Stream } from "@elysiajs/stream";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { UserManager } from "discord.js";

const createSSERoutes = (deps: {
    anthropic: Anthropic;
    openai: OpenAI;
    userManager: UserManager;
}) => {
    return new Elysia()
        .post(
            "/oai",
            ({ body: { prompt, history = [], model = "grp-3.5-turbo", max_tokens = 1024 } }) =>
                new Stream(
                    deps.openai.chat.completions.create({
                        model,
                        max_tokens,
                        stream: true,
                        messages: [
                            ...history,
                            {
                                role: "user",
                                content: prompt,
                            },
                        ],
                    })
                ),
            {
                body: t.Object({
                    history: t.Optional(
                        t.Array(
                            t.Object({
                                role: t.String(),
                                content: t.String(),
                            })
                        )
                    ),
                    prompt: t.String(),
                    model: t.Optional(t.String()),
                    max_tokens: t.Optional(t.Number()),
                }),
                detail: {
                    tags: ["AI"],
                    summary: "OpenAI API",
                    description: "Returns stream",
                },
            }
        )
        .post(
            "aai",
            ({
                body: {
                    prompt,
                    history = [],
                    model = "claude-3-5-haiku-latest",
                    max_tokens = 1024,
                },
            }) =>
                new Stream(
                    deps.anthropic.messages.create({
                        max_tokens: max_tokens,
                        messages: [
                            ...history,
                            {
                                role: "user",
                                content: prompt,
                            },
                        ],
                        model: model,
                        stream: true,
                    })
                ),
            {
                body: t.Object({
                    history: t.Optional(
                        t.Array(
                            t.Object({
                                role: t.String(),
                                content: t.String(),
                            })
                        )
                    ),
                    prompt: t.String(),
                    model: t.Optional(t.String()),
                    max_tokens: t.Optional(t.Number()),
                }),
                detail: {
                    tags: ["AI"],
                    summary: "Anthropic API",
                    description: "Returns stream",
                },
            }
        );
};

export default createSSERoutes;
