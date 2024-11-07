import sqlite3 from "sqlite3";
sqlite3.verbose();

export const db = new sqlite3.Database("db.sqlite");

export const insertHistory = ({ userInput, botResponse, userId }) => {
    const query = "INSERT INTO history (user_id, user_input, bot_response) VALUES (?, ?, ?)";

    db.run(query, [userId, userInput, botResponse], err => {
        if (err) {
            console.error(err);
        }
    });

    db.each("SELECT id, user_input, bot_response, timestamp FROM history", (err, row) => {
        console.log(`${row.id}: ${row.user_input} -> ${row.bot_response} at ${row.timestamp}`);
    });
};

db.serialize(() => {
    db.run(
        "CREATE TABLE IF NOT EXISTS history (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, user_input TEXT, bot_response TEXT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)"
    );

    insertHistory({
        userInput: "Hello",
        botResponse: "Hi",
        userId: 1,
    });
});

db.on("error", err => {
    console.error(err);
});
