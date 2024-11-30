import { EmbedBuilder, Routes } from "discord.js";
import getClient from "../database/supabase.js";

export default class MinecraftServerHandler {
    /**
     * @type {import('discord.js').Client} - Telegraf instance
     */
    discordBot;

    /**
     * @param {import('telegraf').Telegraf} bot - Telegraf instance
     * @returns {MinecraftServerHandler}
     */
    constructor(args) {
        for (const key in args) {
            this[key] = args[key];
        }
        this.messageHash = {};
    }

    initAction(ctx) {}

    /**
     * @param {import("telegraf").Context} ctx
     */
    async initCommand(ctx) {
        try {
            const serverData = await this.getServerInfo();
            if (!serverData) {
                await ctx.reply("❌ Server information not found.");
                return;
            }

            // Send server description if available
            if (serverData?.serverInfo?.description) {
                await ctx.reply(
                    `🎮 *Welcome to Our Minecraft Server!*\n\n${serverData.serverInfo.description}`,
                    { parse_mode: "Markdown" }
                );
            }

            // Send installation instructions
            const formattedInstructions = this.formatInstructions(serverData.instructions);
            await ctx.reply(formattedInstructions, {
                parse_mode: "Markdown",
                disable_web_page_preview: true,
            });

            // Get and send server status
            await this.sendServerStatus(ctx, serverData.serverInfo.server_address);
        } catch (err) {
            console.error("Error in initCommand:", err);
            await ctx.reply("❌ An error occurred while processing your request.");
        }
    }

    /**
     * Formats the installation instructions with emojis and better formatting
     * @param {string[]} instructions
     * @returns {string}
     */
    formatInstructions(instructions) {
        const header = "📝 *Installation Instructions*\n\n";
        const formattedInstructions = instructions
            .map((instruction, index) => {
                const stepNumber = index + 1;
                const emoji = this.getStepEmoji(index);
                return `${stepNumber}. ${emoji} ${instruction}`;
            })
            .join("\n");

        return header + formattedInstructions;
    }

    /**
     * Returns an appropriate emoji for each installation step
     * @param {number} stepIndex
     * @returns {string}
     */
    getStepEmoji(stepIndex) {
        const emojis = {
            0: "☕", // Java
            1: "🎮", // TLauncher
            2: "📦", // Mod Pack
            3: "🔧", // Mods menu
            4: "⚙️", // Settings
            5: "💾", // Backups
            6: "📂", // Restore from file
            7: "📁", // Select zip
            8: "✅", // Restore button
            9: "🎯", // Open minecraft
            10: "🌐", // Multiplayer
            11: "🔗", // Server address
        };
        return emojis[stepIndex] || "•";
    }

    /**
     * Fetches and sends the server status
     * @param {import("telegraf").Context} ctx
     * @param {string} serverAddress
     */
    async sendServerStatus(ctx, serverAddress) {
        try {
            const serverStatus = await this.getServerStatus(serverAddress);

            const status = serverStatus?.online ? "🟢 Online" : "🔴 Offline";
            const version = serverStatus?.version?.name_raw || "Unknown";
            const players = `${serverStatus?.players?.online || 0}/${
                serverStatus?.players?.max || 0
            }`;

            await ctx.reply(
                `🖥️ *Server Status*\n\n` +
                    `Status: ${status}\n` +
                    `Version: ${version}\n` +
                    `Players: ${players} players online`,
                { parse_mode: "Markdown" }
            );
        } catch (err) {
            console.error("Error fetching server status:", err);
            await ctx.reply("❌ Unable to fetch server status");
        }
    }

    async getServerInfo() {
        const dbClient = getClient();
        const { data: rows } = await dbClient.from("servers").select("*");

        if (rows?.length > 0) {
            const serverInfo = rows[0];
            const instructions = [
                "Install [Java Runtime Environment](https://www.java.com/en/download/)",
                "Install [TLauncher](https://tlauncher.org/)",
                `Download [Mod Pack](${serverInfo?.file_link})`,
                "Open TLauncher and navigate to the mods menu",
                "Click the settings button in the top-left corner",
                "Navigate to the backups section",
                "Choose 'Restore from file' option",
                "Select the downloaded mod pack ZIP file",
                "Click the restore button to install mods",
                "Launch Minecraft through TLauncher",
                "Go to Multiplayer menu",
                `Add server with address: \`${serverInfo?.server_address}\``,
            ];

            return { instructions, serverInfo };
        }
        return null;
    }

    async getServerStatus(serverAddress) {
        try {
            const response = await fetch(`https://api.mcstatus.io/v2/status/java/${serverAddress}`);
            const json = await response.json();
            return json;
        } catch (err) {
            console.log(err);
        }
        return {};
    }

    /**
     *
     * @param {import('discord.js').CommandInteraction} interaction
     * @returns
     */
    async handleDiscordSlashCommand(interaction) {
        if (!interaction.isCommand()) return;

        try {
            const serverData = await this.getServerInfo();
            if (!serverData) {
                await interaction.editReply("❌ Server information not found.");
                return;
            }

            // Format and send installation instructions
            const formattedInstructions = this.formatInstructions(serverData.instructions);

            // Create embeds for server information
            const instructionsEmbed = new EmbedBuilder()
                .setColor("#0099ff")
                .setTitle("🎮 Welcome to Our Minecraft Server!")
                .setDescription(formattedInstructions);

            interaction.channel.send({
                embeds: [instructionsEmbed],
            });

            // Get and send server status
            try {
                const status = await this.getServerStatus(serverData.serverInfo.server_address);

                const statusEmbed = new EmbedBuilder()
                    .setColor(status.online ? "#00ff00" : "#ff0000")
                    .setTitle("Server Status")
                    .addFields(
                        {
                            name: "Status",
                            value: status.online ? "🟢 Online" : "🔴 Offline",
                            inline: true,
                        },
                        {
                            name: "Address",
                            value: serverData.serverInfo.server_address,
                            inline: true,
                        }
                    );

                if (status.online) {
                    statusEmbed.addFields(
                        {
                            name: "Players",
                            value: `${status.players.online}/${status.players.max}`,
                            inline: true,
                        },
                        { name: "Version", value: status.version || "Unknown", inline: true }
                    );
                }

                await interaction.channel.send({
                    embeds: [statusEmbed],
                });
            } catch (statusError) {
                console.error("Error getting server status:", statusError);
                await interaction.channel.send("❌ Failed to get server status.");
            }
        } catch (error) {
            console.error("Discord command error:", error);

            await interaction.channel.send({
                content: "❌ An error occurred while processing your request.",
                ephemeral: true,
            });
        }
    }
}
