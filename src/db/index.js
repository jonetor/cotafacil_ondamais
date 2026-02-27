const Database = require("better-sqlite3");
const path = require("path");
const { runMigrations } = require("./migrations");

const DB_PATH = process.env.SQLITE_PATH || path.join(process.cwd(), "data.sqlite");

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

runMigrations(db);

module.exports = { db };