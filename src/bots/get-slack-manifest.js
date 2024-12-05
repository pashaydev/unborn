import { databaseManager } from "../database/db";

(async () => {
    const db = await databaseManager.getDatabase();

    const { data: commands, error } = await db.from("commands").select("*");

    if (error) {
        console.error(error);
        return;
    }

    const manifest = {
        display_information: {
            name: "Ghostwriter",
        },
        commands: commands.map(c => ({
            command: "/" + c.name || "",
            description: c.description || "",
            usage_hint: `Just type /${c.name || ""} to begin`,
        })),
    };

    // You can use this to generate the manifest for copying to the Slack UI
    console.log(JSON.stringify(manifest, null, 2));
})();
