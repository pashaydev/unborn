import sqlite3 from "sqlite3";
sqlite3.verbose();

export const HISTORY_INSERT_QUERY =
    "INSERT INTO history (user_id, user_input, bot_response) VALUES (?, ?, ?)";
export const DB_CREATION_QUERY =
    "CREATE TABLE IF NOT EXISTS history (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, user_input TEXT, bot_response TEXT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)";

export const db = new sqlite3.Database("db.sqlite");

export const insertHistory = ({ userInput, botResponse, userId }, db) => {
    db.run(HISTORY_INSERT_QUERY, [userId, userInput, botResponse], err => {
        if (err) {
            console.error(err);
        }
    });

    db.each("SELECT id, user_input, bot_response, timestamp FROM history", (err, row) => {
        console.log(`${row.id}: ${row.user_input} -> ${row.bot_response} at ${row.timestamp}`);
    });
};

db.serialize(() => {
    db.run(DB_CREATION_QUERY);

    insertHistory(
        {
            userInput: "Hello",
            botResponse: "Hi",
            userId: 1,
        },
        db
    );
});

db.on("error", err => {
    console.error(err);
});
