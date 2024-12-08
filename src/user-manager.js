import { databaseManager } from "./database/db";

class UserManager {
    /**
     * @type {Object.<string, Action>}
     * */
    constructor() {
        this.instance = {};
    }

    /**
     * @param {Object} params
     * @param {string} params.chatId
     * @param {string} params.userId
     * @param {string} params.from
     * @param {string} params.username
     * @param {string} params.active_command
     * @returns {Promise<Object>}
     * */
    async createUser({ chatId, userId, from, username, active_command }) {
        const db = await databaseManager.getDatabase();
        const { data, error } = await db
            .from("users")
            .insert({
                chat_id: chatId,
                user_id: userId,
                from: from,
                username: username,
                active_command,
            })
            .select("*")
            .single();

        if (error) {
            console.error("Error creating user:", error);
            return null;
        }

        if (!this.instance[chatId]) {
            this.instance[chatId] = {};
        }

        console.log("User created successfully: ", data);

        this.instance[chatId][userId] = data;

        return data;
    }

    /**
     * @param {Object} params
     * @param {string} params.chatId
     * @param {string} params.userId
     * @param {object} params.data
     * @returns {Promise<void>}
     */
    async updateInstance({ chatId, userId, data }) {
        console.log("Updating user", userId, data, chatId);
        const db = await databaseManager.getDatabase();
        const query = {};
        const _user = {
            chatId: chatId,
            userId: userId,
            from: data.from,
            username: data.username,
            active_command: data.activeFunction,
        };

        if (data.username) query.username = data.username;
        if (data.from) query.from = data.from;
        if (data.user_id) query.user_id = data.user_id;
        if (data.chat_id) query.chat_id = data.chat_id;
        if (data.activeFunction) query.active_command = data.activeFunction;

        try {
            // First, check if the user exists
            const { data: existingUser, error: checkError } = await db
                .from("users")
                .select("*")
                .eq("user_id", userId)
                .single();

            if (checkError) {
                console.log("Error getting existing user: ", checkError.message);
                return this.createUser(_user);
            }

            // Update the user
            console.log("Query for update user: ", userId, query);
            const { error: updateError } = await db
                .from("users")
                .update(query)
                .eq("user_id", userId);

            if (updateError) {
                console.error("Error updating user:", updateError);
                return;
            }

            // Fetch the updated user
            const { data: updatedUser, error: fetchError } = await db
                .from("users")
                .select("*")
                .eq("user_id", userId)
                .single();

            if (fetchError) {
                console.error("Error fetching updated user:", fetchError);
                return;
            }

            // Update the instance cache
            if (!this.instance[chatId]) {
                this.instance[chatId] = {};
            }

            this.instance[chatId][userId] = _user;
            console.log("User updated Database: ", updatedUser);
            console.log("User updated Memory: ", _user);
        } catch (error) {
            console.error("Error in updateInstance:", error);
        }
    }

    /**
     * @param {string} chatId
     * @returns {Promise<Object>}
     */
    async getChat(chatId) {
        if (this.instance[chatId]) {
            return this.instance[chatId];
        }

        const db = await databaseManager.getDatabase();
        const { data, error } = await db.from("users").select("*").eq("chat_id", chatId);

        if (error) {
            console.error("Error fetching chat:", error);
            return null;
        }

        this.instance[chatId] = data.reduce((acc, user) => {
            acc[user.user_id] = user;
            return acc;
        }, {});

        return this.instance[chatId];
    }

    /**
     * @param {string} chatId
     * @param {string} userId
     * @returns {Promise<Object>}
     */
    async getUser(chatId, userId) {
        const db = await databaseManager.getDatabase();
        const { data, error } = await db.from("users").select("*").eq("user_id", userId).single();

        if (error) {
            console.error("Error fetching user:", error);
        }

        if (!this.instance[chatId]) {
            this.instance[chatId] = {};
        }

        if (!data) {
            if (this.instance[chatId]?.[userId]) {
                return this.instance[chatId][userId];
            }
        }

        this.instance[chatId][userId] = data;

        return data;
    }

    async getCommand(commandName) {
        try {
            console.log("Attempting to get command: ", commandName);

            const db = await databaseManager.getDatabase();
            const { data: command, error } = await db
                .from("commands")
                .select("*")
                .eq("name", commandName)
                .single();

            console.log("Command from database: ", command);

            if (error) return null;

            return command;
        } catch (err) {
            console.error("Error getting command: ", err);
        }
    }
}

export default UserManager;
