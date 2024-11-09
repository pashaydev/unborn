import LazyWtfHandler from "./lazywtf.js";
import { MemeHandler } from "./mem.js";

class ActionFabric {
    /**
     * @description Create action fabric
     * @param {import('telegraf').Telegraf} bot
     * @param {object} anthropic
     * @param {Function} sendMenu
     */

    constructor() {
        if (new.target === ActionFabric) {
            throw new TypeError("Cannot construct ActionFabric instances directly");
        }
    }

    /**
     * @description Create action
     * @param {'lazywtf' | "mem"} actionName
     * @returns {LazyWtfHandler | MemeHandler}
     */
    static createAction(actionName) {
        if (actionName === "lazywtf") {
            return new LazyWtfHandler(this.bot, this.anthropic, this.sendMenu);
        }
        if (actionName === "mem") {
            return new MemeHandler(this.bot, this.anthropic, this.sendMenu);
        }
    }
}

export default ActionFabric;
