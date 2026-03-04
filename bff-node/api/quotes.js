import express from "express";
import crypto from "node:crypto";
import { db } from "../db.js";

const router = express.Router();

/* ===============================
   CRIA TABELAS BASE (sem proposal_number ainda, para evitar erro em banco antigo)
================================ */

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
  code TEXT,
  description TEXT,
  unit TEXT,
  quantity REAL,
  unit_price REAL,
  total_price REAL,
  icms REAL DEFAULT 0,
  issqn REAL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_quote_items_quote
ON quote_items(quote_id);
`);

/* ===============================
   MIGRAÇÃO DEFENSIVA: proposal_number
   (depois que a tabela existe)
================================ */

function hasColumn(table, col) {
  const cols = db.prepare(`PRAGMA table_info('${table}')`).all();
  return cols.some((c) => c.name === col);
}

// ✅ adiciona proposal_number se faltar
if (!hasColumn("quotes", "proposal_number")) {
  db.exec(`ALTER TABLE quotes ADD COLUMN proposal_number TEXT`);
}

// ✅ índice só depois da coluna existir
db.exec(`CREATE INDEX IF NOT EXISTS idx_quotes_proposal_number ON quotes(proposal_number)`);

/* ===============================
   GERA PRÓXIMO NÚMERO DE PROPOSTA
================================ */

function nextProposalNumber() {
  const row = db
    .prepare(`SELECT MAX(CAST(proposal_number AS INTEGER)) AS maxNum FROM quotes`)
    .get();

  const next = Number(row?.maxNum || 0) + 1;
  return String(next).padStart(5, "0");
}

/* ===============================
   CALCULAR TOTAIS (payload)
================================ */

function calcTotalsFromPayload(items = []) {
  let subtotal = 0;
  let tax = 0;

  for (const item of items) {
    const qty = Number(item.quantity || 0);
    const price = Number(item.unit_price || 0);

    const total = qty * price;
    subtotal += total;

    const icms = Number(item?.icms ?? item?.taxes?.icms ?? 0);
    const issqn = Number(item?.issqn ?? item?.taxes?.issqn ?? 0);

    tax += total * ((icms + issqn) / 100);
  }

  return {
    subtotal,
    tax_total: tax,
    total_value: subtotal + tax,
  };
}

/* ===============================
   CALCULAR TOTAIS (banco)
================================ */

function calcTotalsFromDb(quoteId) {
  const items = db
    .prepare(
      `
      SELECT quantity, unit_price, icms, issqn
      FROM quote_items
      WHERE quote_id = ?
    `
    )
    .all(quoteId);

  let subtotal = 0;
  let tax = 0;

  for (const item of items) {
    const qty = Number(item.quantity || 0);
    const price = Number(item.unit_price || 0);

    const total = qty * price;
    subtotal += total;

    const icms = Number(item.icms || 0);
    const issqn = Number(item.issqn || 0);

    tax += total * ((icms + issqn) / 100);
  }

  return {
    subtotal,
    tax_total: tax,
    total_value: subtotal + tax,
    itemsCount: items.length,
  };
}

/* ===============================
   LISTAR COTAÇÕES
================================ */

router.get("/", (req, res) => {
  const rows = db
    .prepare(
      `
      SELECT *
      FROM quotes
      ORDER BY created_at DESC
    `
    )
    .all();

  res.json(rows);
});

/* ===============================
   BUSCAR UMA COTAÇÃO (com itens)
================================ */

router.get("/:id", (req, res) => {
  const id = req.params.id;

  const quote = db
    .prepare(
      `
      SELECT *
      FROM quotes
      WHERE id = ?
    `
    )
    .get(id);

  if (!quote) {
    return res.status(404).json({ error: "Cotação não encontrada" });
  }

  const items = db
    .prepare(
      `
      SELECT *
      FROM quote_items
      WHERE quote_id = ?
      ORDER BY rowid ASC
    `
    )
    .all(id);

  quote.items = items;

  res.json(quote);
});

/* ===============================
   CRIAR COTAÇÃO (gera proposal_number)
================================ */

router.post("/", (req, res) => {
  const data = req.body || {};
  const id = crypto.randomUUID();
  const now = Date.now();

  const items = Array.isArray(data.items) ? data.items : [];
  const totals = calcTotalsFromPayload(items);

  const proposal_number = data.proposal_number
    ? String(data.proposal_number).padStart(5, "0")
    : nextProposalNumber();

  const trx = db.transaction(() => {
    db.prepare(
      `
      INSERT INTO quotes (
        id,
        proposal_number,
        client_id,
        client_name,
        status,
        subtotal,
        tax_total,
        total_value,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    ).run(
      id,
      proposal_number,
      data.client_id || null,
      data.client_name || "",
      data.status || "pending",
      totals.subtotal,
      totals.tax_total,
      totals.total_value,
      now,
      now
    );

    const insertItem = db.prepare(
      `
      INSERT INTO quote_items (
        id,
        quote_id,
        product_id,
        code,
        description,
        unit,
        quantity,
        unit_price,
        total_price,
        icms,
        issqn
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    );

    for (const item of items) {
      const qty = Number(item.quantity || 0);
      const price = Number(item.unit_price || 0);

      const icms = Number(item?.icms ?? item?.taxes?.icms ?? 0);
      const issqn = Number(item?.issqn ?? item?.taxes?.issqn ?? 0);

      insertItem.run(
        crypto.randomUUID(),
        id,
        item.product_id || item.id || null,
        item.code || "",
        item.description || "",
        item.unit || "un",
        qty,
        price,
        qty * price,
        icms,
        issqn
      );
    }
  });

  trx();

  res.json({ ok: true, id, proposal_number });
});

/* ===============================
   ATUALIZAR COTAÇÃO
================================ */

router.put("/:id", (req, res) => {
  const id = req.params.id;
  const data = req.body || {};
  const now = Date.now();

  const items = Array.isArray(data.items) ? data.items : [];
  const totals = calcTotalsFromPayload(items);

  const trx = db.transaction(() => {
    const current = db.prepare(`SELECT proposal_number FROM quotes WHERE id=?`).get(id);
    if (!current) throw new Error("Cotação não encontrada");

    const proposal_number = data.proposal_number
      ? String(data.proposal_number).padStart(5, "0")
      : (current.proposal_number || null);

    db.prepare(
      `
      UPDATE quotes
      SET
        proposal_number = ?,
        client_id = ?,
        client_name = ?,
        subtotal = ?,
        tax_total = ?,
        total_value = ?,
        updated_at = ?
      WHERE id = ?
    `
    ).run(
      proposal_number,
      data.client_id || null,
      data.client_name || "",
      totals.subtotal,
      totals.tax_total,
      totals.total_value,
      now,
      id
    );

    db.prepare(`DELETE FROM quote_items WHERE quote_id = ?`).run(id);

    const insertItem = db.prepare(
      `
      INSERT INTO quote_items (
        id,
        quote_id,
        product_id,
        code,
        description,
        unit,
        quantity,
        unit_price,
        total_price,
        icms,
        issqn
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    );

    for (const item of items) {
      const qty = Number(item.quantity || 0);
      const price = Number(item.unit_price || 0);

      const icms = Number(item?.icms ?? item?.taxes?.icms ?? 0);
      const issqn = Number(item?.issqn ?? item?.taxes?.issqn ?? 0);

      insertItem.run(
        crypto.randomUUID(),
        id,
        item.product_id || item.id || null,
        item.code || "",
        item.description || "",
        item.unit || "un",
        qty,
        price,
        qty * price,
        icms,
        issqn
      );
    }
  });

  try {
    trx();
    res.json({ ok: true });
  } catch (e) {
    res.status(404).json({ error: e?.message || String(e) });
  }
});

/* ===============================
   APROVAR COTAÇÃO (não zera)
================================ */

router.post("/:id/approve", (req, res) => {
  const id = req.params.id;
  const now = Date.now();

  const trx = db.transaction(() => {
    const totals = calcTotalsFromDb(id);

    if (totals.itemsCount === 0) {
      throw new Error("Cotação não possui itens para aprovar");
    }

    const result = db
      .prepare(
        `
        UPDATE quotes
        SET
          status = 'approved',
          subtotal = ?,
          tax_total = ?,
          total_value = ?,
          updated_at = ?
        WHERE id = ?
      `
      )
      .run(totals.subtotal, totals.tax_total, totals.total_value, now, id);

    if (result.changes === 0) {
      throw new Error("Cotação não encontrada");
    }
  });

  try {
    trx();
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e?.message || String(e) });
  }
});

/* ===============================
   EXCLUIR COTAÇÃO
================================ */

router.delete("/:id", (req, res) => {
  const id = req.params.id;

  const trx = db.transaction(() => {
    db.prepare(`DELETE FROM quote_items WHERE quote_id = ?`).run(id);
    db.prepare(`DELETE FROM quotes WHERE id = ?`).run(id);
  });

  trx();

  res.json({ ok: true });
});

export default router;