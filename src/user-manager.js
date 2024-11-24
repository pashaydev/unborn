import { databaseManager } from "./database/db";

class UserManager {
    /**
     * @type {Object.<string, Action>}
     * @private
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
     * @returns {Promise<Object>}
     * */
    async createUser({ chatId, userId, from, username }) {
        const db = await databaseManager.getDatabase();
        const { data, error } = await db
            .from("users")
            .insert({
                chat_id: chatId,
                user_id: userId,
                from: from,
                username: username,
            })
            .single();

        if (error) {
            console.error("Error creating user:", error);
            return null;
        }

        if (!this.instance[chatId]) {
            this.instance[chatId] = {};
        }
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
                return this.createUser({
                    chatId: chatId,
                    userId: userId,
                    from: data.from,
                    username: data.username,
                    activeFunction: data.activeFunction,
                });
            }

            // Update the user
            console.log("Updating user", userId, query);
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

            // updatedUser.active_command = data.activeFunction;
            updatedUser.once = data.once;
            this.instance[chatId][userId] = updatedUser;
            console.log("User updated", updatedUser);
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
        if (this.instance[chatId]?.[userId]) {
            return this.instance[chatId][userId];
        }

        const db = await databaseManager.getDatabase();
        const { data, error } = await db
            .from("users")
            .select("*")
            .eq("chat_id", chatId)
            .eq("user_id", userId)
            .single();

        if (error) {
            console.error("Error fetching user:", error);
            return null;
        }

        if (!this.instance[chatId]) {
            this.instance[chatId] = {};
        }
        this.instance[chatId][userId] = data;

        return data;
    }
}

export default UserManager;
