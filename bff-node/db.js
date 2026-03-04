// bff-node/db.js
import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, "voalle-cache.sqlite");
export const db = new Database(dbPath);

db.pragma("journal_mode = WAL");
db.pragma("synchronous = NORMAL");

export function onlyDigits(s) {
  return String(s || "").replace(/\D/g, "");
}

export function norm(s) {
  return String(s || "")
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Migração defensiva:
 * versões antigas do projeto criavam auth_users com colunas diferentes
 * (ex.: sem updated_at). Aqui garantimos que as colunas exigidas existam.
 */
function ensureAuthUsersSchema() {
  const exists = db
    .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='auth_users'`)
    .get();
  if (!exists) return;

  const cols = db.prepare(`PRAGMA table_info('auth_users')`).all();
  const names = new Set(cols.map((c) => c.name));

  const now = Date.now();

  // adiciona updated_at se faltar
  if (!names.has("updated_at")) {
    db.prepare(`ALTER TABLE auth_users ADD COLUMN updated_at INTEGER`).run();
    // tenta popular com created_at (se existir), senão agora
    if (names.has("created_at")) {
      try {
        db.prepare(`UPDATE auth_users SET updated_at = COALESCE(updated_at, created_at, ?)`).run(now);
      } catch {
        db.prepare(`UPDATE auth_users SET updated_at = COALESCE(updated_at, ?)`).run(now);
      }
    } else {
      db.prepare(`UPDATE auth_users SET updated_at = COALESCE(updated_at, ?)`).run(now);
    }
  }

  // adiciona created_at se faltar
  if (!names.has("created_at")) {
    db.prepare(`ALTER TABLE auth_users ADD COLUMN created_at INTEGER`).run();
    db.prepare(`UPDATE auth_users SET created_at = COALESCE(created_at, ?)`).run(now);
  }

  // adiciona is_active se faltar
  if (!names.has("is_active")) {
    db.prepare(`ALTER TABLE auth_users ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1`).run();
    db.prepare(`UPDATE auth_users SET is_active = 1 WHERE is_active IS NULL`).run();
  }

  // adiciona role se faltar
  if (!names.has("role")) {
    db.prepare(`ALTER TABLE auth_users ADD COLUMN role TEXT NOT NULL DEFAULT 'seller'`).run();
    db.prepare(`UPDATE auth_users SET role = COALESCE(role, 'seller')`).run();
  }

  // garante índices
  db.prepare(`CREATE INDEX IF NOT EXISTS idx_auth_users_email ON auth_users(email)`).run();
  db.prepare(`CREATE INDEX IF NOT EXISTS idx_auth_users_role ON auth_users(role)`).run();
}

export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS voalle_clients (
      id TEXT PRIMARY KEY,
      cpf_cnpj TEXT,
      cpf_cnpj_digits TEXT,
      nome_razao TEXT,
      nome_fantasia TEXT,
      email TEXT,
      telefone TEXT,
      city TEXT,
      state TEXT,
      raw_json TEXT,
      updated_at INTEGER
    );

    CREATE INDEX IF NOT EXISTS idx_voalle_clients_doc_digits ON voalle_clients(cpf_cnpj_digits);
    CREATE INDEX IF NOT EXISTS idx_voalle_clients_nome_razao ON voalle_clients(nome_razao);
    CREATE INDEX IF NOT EXISTS idx_voalle_clients_nome_fantasia ON voalle_clients(nome_fantasia);

    -- ✅ AUTH (BFF)
    CREATE TABLE IF NOT EXISTS auth_users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'seller',
      password_hash TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_auth_users_email ON auth_users(email);
    CREATE INDEX IF NOT EXISTS idx_auth_users_role ON auth_users(role);

    -- ✅ ORÇAMENTOS (CotaFácil)
    CREATE TABLE IF NOT EXISTS budgets (
      id TEXT PRIMARY KEY,
      customer_id TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      notes TEXT,

      -- vendedor (vem do login)
      seller_id TEXT,
      seller_name TEXT,
      seller_email TEXT,

      -- totais (simplificado)
      subtotal REAL NOT NULL DEFAULT 0,
      discount_total REAL NOT NULL DEFAULT 0,
      tax_total REAL NOT NULL DEFAULT 0,
      freight_total REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL DEFAULT 0,

      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_budgets_created_at ON budgets(created_at);
    CREATE INDEX IF NOT EXISTS idx_budgets_customer_id ON budgets(customer_id);

    -- ✅ PRODUTOS (manual + Voalle)
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,

      -- campos do CotaFácil (mantidos)
      cod TEXT,
      description TEXT,
      type TEXT,
      unit TEXT,
      sale_price REAL,
      active INTEGER NOT NULL DEFAULT 1,

      -- origem
      source TEXT NOT NULL DEFAULT 'manual',

      -- campos Voalle (extras)
      use TEXT,
      original_price REAL,
      payment_form TEXT,
      payment_form_code TEXT,
      is_loyalty INTEGER,
      loyalty_price REAL,
      loyalty_months INTEGER,
      campaign_code TEXT,
      campaign_title TEXT,
      price_list_id INTEGER,
      price_list_code TEXT,
      price_list_title TEXT,

      raw_json TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_products_cod ON products(cod);
    CREATE INDEX IF NOT EXISTS idx_products_source ON products(source);
    CREATE INDEX IF NOT EXISTS idx_products_type ON products(type);
    CREATE INDEX IF NOT EXISTS idx_products_use ON products(use);
  `);

  // migrações defensivas
  ensureAuthUsersSchema();
}
