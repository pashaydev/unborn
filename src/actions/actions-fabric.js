import ChessGameHandler from "./chess.js";
import DockAsker from "./dock-asker.js";
import { MemeHandler } from "./mem.js";

class ActionFabric {
    /**
     * @description Abstract class for actions
     * @constructor ActionFabric
     * @returns {void}
     */

    constructor() {
        if (new.target === ActionFabric) {
            throw new TypeError("Cannot construct ActionFabric instances directly");
        }
    }

    /**
     * @description Create action
     * @param {'dockasker' | "mem" | "chess"} actionName
     * @returns {DockAsker | MemeHandler | ChessGameHandler}
     */
    static createAction(actionName) {
        if (actionName === "dockasker") {
            return new DockAsker(this.bot, this.anthropic, this.sendMenu);
        }
        if (actionName === "mem") {
            return new MemeHandler(this.bot, this.anthropic, this.sendMenu);
        }
        if (actionName === "chess") {
            return new ChessGameHandler(this.bot, this.anthropic, this.sendMenu);
        }
    }
}

export default ActionFabric;
