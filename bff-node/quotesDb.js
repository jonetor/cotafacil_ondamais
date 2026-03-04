// bff-node/quotesDb.js
import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "quotes.sqlite");

let db;

export function initQuotesDb() {
  if (db) return db;

  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  db = new Database(DB_PATH);

  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON"); // ✅ IMPORTANTE

  db.exec(`
    CREATE TABLE IF NOT EXISTS quotes (
      id TEXT PRIMARY KEY,
      proposal_number TEXT,
      revision INTEGER DEFAULT 0,
      status TEXT DEFAULT 'pending',

      created_at TEXT,
      updated_at TEXT,

      user_id TEXT,
      seller_id TEXT,

      company_id TEXT,
      client_id TEXT,

      company_source TEXT,
      client_source TEXT,
      client_external_id TEXT,

      company_name TEXT,
      company_document TEXT,

      client_name TEXT,
      client_document TEXT,

      contact_person TEXT,

      validity_date TEXT,
      payment_terms TEXT,
      freight_type TEXT,
      delivery_location TEXT,
      notes TEXT,

      total_value REAL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS quote_items (
      id TEXT PRIMARY KEY,
      quote_id TEXT NOT NULL,

      item_id TEXT,
      item_type TEXT,

      code TEXT,
      description TEXT,
      unit TEXT,

      quantity REAL DEFAULT 0,
      unit_price REAL DEFAULT 0,
      total_price REAL DEFAULT 0,

      taxes_json TEXT,

      created_at TEXT,
      updated_at TEXT,

      FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_quote_items_quote_id ON quote_items(quote_id);
  `);

  return db;
}

export function getQuotesDb() {
  if (!db) initQuotesDb();
  return db;
}