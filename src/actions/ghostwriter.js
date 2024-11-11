import { message } from "telegraf/filters";
import { saveHistory } from "../db.js";

class GhostwriterHandler {
  /**
   * @param {import('telegraf').Telegraf} bot - Telegraf instance
   * @param {import("@anthropic-ai/sdk").Anthropic} anthropic - Anthropic instance
   * @param {Function} sendMenu - Menu sending function
   * @param {import("openai").OpenAI} openai - OpenAI instance
   * @description Handles the ghostwriter action
   * @constructor GhostwriterHandler
   * @returns {GhostwriterHandler}
   */
  constructor(bot, anthropic, sendMenu, openai) {
    this.bot = bot;
    this.anthropic = anthropic;
    this.openai = openai;
    this.sendMenu = sendMenu;

    this.messageHash = {};

    this.bot.action("ghostwriter", (ctx) => {
      ctx.reply("Write me text");
      this.subscribeToTextMessage(ctx);
      this.messageHash[ctx.userId] = 0;
    });

    this.bot.command("ghostwriter", async (ctx) => {
      this.bot.telegram.deleteMessage(ctx.chat.id, ctx.message.message_id);
      this.subscribeToTextMessage(ctx);
      this.messageHash[ctx.userId] = 0;
      // Get the user ID of who should receive the message
      // const targetUserId = ctx.message.reply_to_message?.from?.id; // If replying to someone
      // // Or from command like /secret @username message
      // if (!targetUserId) {
      //   await ctx.reply(
      //     "Please reply to a user or mention them to send a secret message",
      //   );
      //   return;
      // }
      // try {
      //   // Extract the message content (everything after /secret)
      //   const secretMessage = ctx.message.text.split(" ").slice(1).join(" ");
      //   // Send private message to the user
      //   await ctx.telegram.sendMessage(
      //     targetUserId,
      //     `Secret message from ${ctx.message.from.first_name}:\n${secretMessage}`,
      //   );
      //   // Delete the command message from group if possible
      //   await ctx.deleteMessage();
      //   // Send confirmation to sender via private message
      //   await ctx.telegram.sendMessage(
      //     ctx.message.from.id,
      //     "Secret message sent successfully!",
      //   );
      // } catch (error) {
      //   // Handle case where bot can't message the user (hasn't started bot)
      //   await ctx.reply(
      //     "Unable to send secret message. Make sure the user has started the bot.",
      //   );
      // }
    });
  }

  /**
    @param {import('telegraf').Context} ctx - Telegraf context
  */
  subscribeToTextMessage(ctx) {
    this.bot.on("message", async (ctx) => {
      if (this.messageHash[ctx.userId] === 1) {
        return;
      }
      this.handleTextMessage(ctx);
    });
  }

  async handleTextMessage(ctx) {
    ctx.telegram.deleteMessage(ctx.chat.id, ctx.message.message_id);

    const userText = ctx.message.text;

    saveHistory({
      userId: ctx.from.id,
      userInput: userText,
      botResponse: `User Name: ${ctx.from.first_name} ${ctx.from.last_name}`,
    });

    if (userText.length > 150_000) {
      return ctx.reply(
        "Text is too long. Please send text with less than 150,000 characters.",
      );
    }

    let aiRes = "";
    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `
                    Act strictly as a ghostwriter.
                    Rephrase any message provided by the user, regardless of content, politely and respectfully.
                    Do not respond from your own perspective or provide any commentary.
                    Only deliver the rephrased version as if it were written by the user, and avoid apologies or disclaimers.`,
          },
          {
            role: "user",
            content: "rephrase that message: " + userText,
          },
        ],
      });

      aiRes = completion.choices[0].message.content;
    } catch (err) {
      console.error(err);
      saveHistory({
        userId: ctx.from.id,
        userInput: "AI error",
        botResponse: `Error: ${err.message}`,
      });
    }

    if (!aiRes) {
      ctx.reply("An error occurred. Please try again.");
      return this.sendMenu(ctx);
    }

    saveHistory({
      userId: ctx.from.id,
      userInput: "AI response",
      botResponse: aiRes,
    });

    ctx.telegram.sendMessage(ctx.chat.id, aiRes);

    this.messageHash[ctx.userId] = 1;
  }
}

export default GhostwriterHandler;
