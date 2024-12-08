import { Elysia, t } from "elysia";
import { databaseManager } from "../../database/db";
import { JWTOption } from "@elysiajs/jwt";

export const authRoutes = new Elysia()
    .post(
        "/signup",
        async request => {
            const body = request.body;
            const jwt = (request as any).jwt;

            const { username, password, repeatPassword: pass2 } = body;

            if (password !== pass2) throw new Error("Passwords do not match");

            const db = await databaseManager.getDatabase();

            if (!db) throw new Error("Database not reachable");

            const bcryptHash = await Bun.password.hash(password, {
                algorithm: "bcrypt",
                cost: 4,
            });

            const { data: existingUser } = await db
                .from("users")
                .select("*")
                .eq("username", username)
                .single();

            const userId = existingUser?.user_id || String(Math.floor(Math.random() * 1000000));
            const userData = {
                username,
                user_id: userId,
                hash_pass: bcryptHash,
                from: "web",
                chat_id: userId,
            };

            const { data: user, error } = existingUser
                ? await db.from("users").update(userData).eq("user_id", userId).select("*").single()
                : await db
                      .from("users")
                      .insert(userData)
                      .filter("user_id", "eq", userId)
                      .select("*")
                      .single();

            if (error) throw new Error(error.message);

            return {
                token: await jwt.sign({
                    ...user,
                    exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
                }),
            };
        },
        {
            body: t.Object({
                username: t.String(),
                password: t.String(),
                repeatPassword: t.String(),
            }),
            detail: {
                summary: "Sign up and get access token",
                tags: ["Auth"],
            },
        }
    )
    .post(
        "/login",
        async request => {
            const body = request.body;
            const jwt = (request as any).jwt;
            const { username, password } = body;
            const db = await databaseManager.getDatabase();

            if (!db) throw new Error("Database not reachable");

            const { data: user, error } = await db
                .from("users")
                .select("*")
                .eq("username", username)
                .single();

            if (error) throw new Error(error.message);

            const isMatch = await Bun.password.verify(password, user.hash_pass);

            if (!isMatch) throw new Error("Invalid credentials");

            return {
                success: true,
                token: await jwt.sign({
                    ...user,
                    exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
                }),
            };
        },
        {
            body: t.Object({
                username: t.String(),
                password: t.String(),
            }),
            detail: {
                summary: "Login and get access token",
                tags: ["Auth"],
            },
        }
    );
