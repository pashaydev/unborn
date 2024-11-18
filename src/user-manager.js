import { addNewUser } from "./database/db";

class UserManager {
    /**
     * @type {Object.<string, Action>}
     * @private
     * */
    constructor() {
        this.instance = {};
    }

    /**
     * @param {string} chatId
     * @param {string} userId
     * @returns {void}
     * */
    createChat(chatId, userId) {
        return {
            chatId,
            userId,
        };
    }

    /**
     * @param {string} chatId
     * @param {string} userId
     * @returns {void}
     * */
    createUser(chatId, userId) {
        return {
            userId,
            chatId,
        };
    }

    /**
     * @param {string} chatId
     * @param {string} userId
     * @param {object} data
     * @returns {void}
     */
    updateInstance({ chatId, userId, data, ctx }) {
        if (!this.instance[chatId]) {
            this.instance[chatId] = this.createChat(chatId, userId);
        }

        if (!this.instance[chatId][userId]) {
            addNewUser({ userId, username: ctx.from.username });
            this.instance[chatId][userId] = this.createUser(chatId, userId);
        }

        this.instance[chatId][userId] = {
            ...this.instance[chatId][userId],
            ...data,
        };
    }

    getChat(chatId) {
        return this.instance?.[chatId];
    }

    getUser(chatId, userId) {
        return this.instance?.[chatId]?.[userId];
    }
}

export default UserManager;
