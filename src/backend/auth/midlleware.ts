import { Elysia } from "elysia";
import { jwt } from "@elysiajs/jwt";

export const authMiddleware = (app: Elysia) =>
    app
        .use(
            jwt({
                name: "jwt",
                secret: process.env.JWT_SECRET || "your-secret-key",
                exp: "1h",
            })
        )
        .derive(({ jwt, headers }) => ({
            authenticate: async () => {
                const authorization = headers.authorization;
                if (!authorization) throw new Error("Authorization header missing");

                const token = authorization.split(" ")[1];
                if (!token) throw new Error("Token missing");

                const payload = await jwt.verify(token);
                if (!payload) throw new Error("Invalid token");

                return payload;
            },
        }));
