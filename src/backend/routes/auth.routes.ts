import { Elysia, t } from "elysia";
import { databaseManager } from "../../database/db";

export const authRoutes = new Elysia()
    .post(
        "/api/signup",
        async request => {
            const body = request.body;
            const jwt = (request as any).jwt;

            const { username, password, repeatPassword: pass2, email } = body;

            const ip = request.headers["x-forwarded-for"];

            if (password !== pass2) throw new Error("Passwords do not match");

            const db = await databaseManager.getDatabase();

            if (!db) throw new Error("Database not reachable");

            const bcryptHash = await Bun.password.hash(password, {
                algorithm: "bcrypt",
                cost: 4,
            });

            const { data: existingUserByUsername } = await db
                .from("users")
                .select("*")
                .eq("username", username)
                .single();

            if (existingUserByUsername) {
                return new Error("User with this username already exists");
            }

            const { data: existingUserByIp } = await db
                .from("users")
                .select("*")
                .eq("ip", ip)
                .single();

            if (existingUserByIp) {
                return new Error("IP should be unique");
            }

            const userId = String(Math.floor(Math.random() * 1000000));
            const userData = {
                username,
                user_id: userId,
                hash_pass: bcryptHash,
                from: "web",
                chat_id: userId,
                email,
                ip,
            };

            const { data: user, error } = await db
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
                email: t.String(),
                repeatPassword: t.String(),
            }),
            detail: {
                summary: "Sign up and get access token",
                tags: ["Auth"],
            },
        }
    )
    .post(
        "/api/login",
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
