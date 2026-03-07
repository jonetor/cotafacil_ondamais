// bff-node/api/sales.js
import express from "express";
import { db } from "../db.js";
import { requireAuth } from "./auth.js";

const router = express.Router();

/* =========================================
   MIGRAÇÃO DEFENSIVA (não quebra DB antigo)
========================================= */

function tableExists(name) {
  return db
    .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
    .get(name);
}

function getColumns(table) {
  const rows = db.prepare(`PRAGMA table_info('${table}')`).all();
  return new Set(rows.map((r) => r.name));
}

function ensureColumn(table, col, ddl) {
  const cols = getColumns(table);
  if (!cols.has(col)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
  }
}

function ensureQuotesAndItemsSchema() {
  // cria tabelas se ainda não existirem
  db.exec(`
    CREATE TABLE IF NOT EXISTS quotes (
      id TEXT PRIMARY KEY,
      client_id TEXT,
      client_name TEXT,
      status TEXT DEFAULT 'pending',
      subtotal REAL DEFAULT 0,
      tax_total REAL DEFAULT 0,
      discount_total REAL DEFAULT 0,
      total_value REAL DEFAULT 0,
      created_at INTEGER,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS quote_items (
      id TEXT PRIMARY KEY,
      quote_id TEXT,
      product_id TEXT,
      item_type TEXT,
      code TEXT,
      description TEXT,
      unit TEXT,
      quantity REAL,
      unit_price REAL,
      total_price REAL,
      icms REAL DEFAULT 0,
      issqn REAL DEFAULT 0
    );
  `);

  // se já existiam, garante colunas novas (DB antigo)
  // quotes
  ensureColumn("quotes", "seller_id", "seller_id TEXT");
  ensureColumn("quotes", "proposal_number", "proposal_number TEXT");
  ensureColumn("quotes", "revision", "revision INTEGER DEFAULT 0");
  ensureColumn("quotes", "user_id", "user_id TEXT");
  ensureColumn("quotes", "company_id", "company_id TEXT");
  ensureColumn("quotes", "company_name", "company_name TEXT");
  ensureColumn("quotes", "company_document", "company_document TEXT");
  ensureColumn("quotes", "client_document", "client_document TEXT");
  ensureColumn("quotes", "contact_person", "contact_person TEXT");
  ensureColumn("quotes", "validity_date", "validity_date TEXT");
  ensureColumn("quotes", "payment_terms", "payment_terms TEXT");
  ensureColumn("quotes", "freight_type", "freight_type TEXT");
  ensureColumn("quotes", "delivery_location", "delivery_location TEXT");
  ensureColumn("quotes", "notes", "notes TEXT");
  ensureColumn("quotes", "additional_info", "additional_info TEXT");

  // created_at / updated_at podem estar nulos em db antigo
  // não dá pra alterar default em sqlite com facilidade sem recriar tabela,
  // então só garantimos que existe.

  // quote_items
  ensureColumn("quote_items", "item_type", "item_type TEXT");
  ensureColumn("quote_items", "total_price", "total_price REAL");
}

function ensureCommissionSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS commission_settings (
      id TEXT PRIMARY KEY,
      product_percent REAL NOT NULL DEFAULT 0,
      service_percent REAL NOT NULL DEFAULT 0,
      scm_percent REAL NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL
    );
  `);

  const row = db.prepare(`SELECT * FROM commission_settings WHERE id='default'`).get();
  if (!row) {
    db.prepare(`
      INSERT INTO commission_settings (id, product_percent, service_percent, scm_percent, updated_at)
      VALUES ('default', 0, 0, 0, ?)
    `).run(Date.now());
  }
}

function ensureIndexes() {
  // só cria índices depois que schema está ok
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
    CREATE INDEX IF NOT EXISTS idx_quotes_seller ON quotes(seller_id);
    CREATE INDEX IF NOT EXISTS idx_quotes_created ON quotes(created_at);
    CREATE INDEX IF NOT EXISTS idx_quote_items_quote ON quote_items(quote_id);
  `);
}

// roda migrações ao importar o arquivo (antes de usar rotas)
ensureQuotesAndItemsSchema();
ensureCommissionSchema();
ensureIndexes();

/* =========================================
   HELPERS
========================================= */

function getSettings() {
  return db.prepare(`SELECT * FROM commission_settings WHERE id='default'`).get();
}

function sumByType(items) {
  let product = 0;
  let service = 0;
  let scm = 0;

  for (const it of items) {
    const t = String(it.item_type || "").toUpperCase();
    const total = Number(it.total_price || 0);

    if (t === "PRODUTO") product += total;
    else if (t === "SERVICO" || t === "SERVIÇO") service += total;
    else if (t === "SERVICO_SCM") scm += total;
  }

  return { product, service, scm, total: product + service + scm };
}

/* =========================================
   GET /api/sales
   - seller: só dele
   - admin: todas e filtra por seller_id
========================================= */

router.get("/sales", requireAuth, (req, res) => {
  const role = String(req.user?.role || "").toLowerCase();
  const userId = String(req.user?.sub || "");

  const sellerFilter = String(req.query.seller_id || "").trim(); // só admin
  const q = String(req.query.q || "").trim().toLowerCase();
  const from = Number(req.query.from || 0); // timestamp ms
  const to = Number(req.query.to || 0);     // timestamp ms

  let where = `WHERE q.status = 'approved'`;
  const params = [];

  if (role !== "admin") {
    where += ` AND q.seller_id = ?`;
    params.push(userId);
  } else if (sellerFilter) {
    where += ` AND q.seller_id = ?`;
    params.push(sellerFilter);
  }

  if (from) {
    where += ` AND q.created_at >= ?`;
    params.push(from);
  }
  if (to) {
    where += ` AND q.created_at <= ?`;
    params.push(to);
  }
  if (q) {
    where += ` AND (lower(q.client_name) LIKE ? OR lower(q.proposal_number) LIKE ?)`;
    params.push(`%${q}%`, `%${q}%`);
  }

  const rows = db.prepare(`
    SELECT q.*
    FROM quotes q
    ${where}
    ORDER BY q.created_at DESC
    LIMIT 500
  `).all(...params);

  const settings = getSettings();
  const productPercent = Number(settings?.product_percent || 0);
  const servicePercent = Number(settings?.service_percent || 0);
  const scmPercent = Number(settings?.scm_percent || 0);

  const getItems = db.prepare(`
    SELECT item_type, total_price
    FROM quote_items
    WHERE quote_id = ?
  `);

  const out = rows.map((quote) => {
    const items = getItems.all(quote.id);
    const totals = sumByType(items);

    const commission =
      totals.product * (productPercent / 100) +
      totals.service * (servicePercent / 100) +
      totals.scm * (scmPercent / 100);

    return {
      ...quote,
      totals_by_type: totals,
      commission_settings: {
        product_percent: productPercent,
        service_percent: servicePercent,
        scm_percent: scmPercent,
      },
      commission_value: commission,
    };
  });

  return res.json({ ok: true, items: out });
});

export default router;