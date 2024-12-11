import { Elysia, InferContext } from "elysia";
import { swagger } from "@elysiajs/swagger";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { authRoutes } from "./routes/auth.routes";
import { scrapperRoutes } from "./routes/scrapper.routes";
import UserManager from "../user-manager";
import { authMiddleware } from "./auth/midlleware";
import { ghostwriterRoutes } from "./routes/ghostwriter.routes";
import { createUiRotes } from "./routes/ui.routes";
import html from "@elysiajs/html";
import staticPlugin from "@elysiajs/static";

export const startHttpServer = async (config: any) => {
    const anthropic = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });
    const openai = new OpenAI({ apiKey: config.OPENAI_API_KEY });
    const userManager = new UserManager();

    try {
        const deps = { anthropic, openai, userManager };
        const app = new Elysia({
            serve: { idleTimeout: 255 },
        })
            .use(authMiddleware)
            .use(html())
            .use(staticPlugin())
            .use(
                swagger({
                    documentation: {
                        info: {
                            title: "Unborn Backend",
                            version: "0.0.1",
                        },
                    },
                    autoDarkMode: true,
                })
            )
            .use(authRoutes)
            .use(scrapperRoutes(deps))
            .use(ghostwriterRoutes(deps))
            .use(createUiRotes(deps))
            .listen(Bun.env.PORT || 3000);

        type Context = InferContext<typeof app>;

        console.log(`🦊 Server is running at ${app.server?.hostname}:${app.server?.port}`);
    } catch (err) {
        console.error("Server startup error:", err);
    }
};
