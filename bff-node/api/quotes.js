import express from "express";
import crypto from "node:crypto";
import { db } from "../db.js";
import { requireAuth } from "./auth.js";
import { writeAuditLog } from "../audit.js";

const router = express.Router();

/* ===============================
   MIGRAÇÃO DEFENSIVA
================================ */

function getColumns(table) {
  return db.prepare(`PRAGMA table_info(${table})`).all();
}

function ensureColumn(table, columnName, sqlDef) {
  const cols = getColumns(table);
  const exists = cols.some((c) => c.name === columnName);
  if (!exists) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${sqlDef}`);
  }
}

/* ===============================
   CRIA TABELAS SE NÃO EXISTIREM
================================ */

db.exec(`
CREATE TABLE IF NOT EXISTS quotes (
  id TEXT PRIMARY KEY,
  proposal_number TEXT,
  revision INTEGER DEFAULT 0,

  user_id TEXT,
  seller_id TEXT,

  company_id TEXT,
  company_name TEXT,
  company_document TEXT,

  client_id TEXT,
  client_name TEXT,
  client_document TEXT,

  contact_person TEXT,

  status TEXT DEFAULT 'pending',

  validity_date TEXT,
  payment_terms TEXT,
  freight_type TEXT,
  delivery_location TEXT,
  notes TEXT,
  additional_info TEXT,

  objeto TEXT,
  missao TEXT,
  escopo_tecnico TEXT,
  segmentacao TEXT,
  investimento_texto TEXT,
  condicoes_comerciais TEXT,
  assinatura_tecnica TEXT,
  forma_pagamento TEXT,
  validade_proposta TEXT,
  observacoes TEXT,

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

CREATE INDEX IF NOT EXISTS idx_quote_items_quote
ON quote_items(quote_id);
`);

/* ===============================
   GARANTE COLUNAS EM BANCOS ANTIGOS
================================ */

ensureColumn("quotes", "proposal_number", "proposal_number TEXT");
ensureColumn("quotes", "revision", "revision INTEGER DEFAULT 0");
ensureColumn("quotes", "user_id", "user_id TEXT");
ensureColumn("quotes", "seller_id", "seller_id TEXT");
ensureColumn("quotes", "company_id", "company_id TEXT");
ensureColumn("quotes", "company_name", "company_name TEXT");
ensureColumn("quotes", "company_document", "company_document TEXT");
ensureColumn("quotes", "client_id", "client_id TEXT");
ensureColumn("quotes", "client_name", "client_name TEXT");
ensureColumn("quotes", "client_document", "client_document TEXT");
ensureColumn("quotes", "contact_person", "contact_person TEXT");
ensureColumn("quotes", "validity_date", "validity_date TEXT");
ensureColumn("quotes", "payment_terms", "payment_terms TEXT");
ensureColumn("quotes", "freight_type", "freight_type TEXT");
ensureColumn("quotes", "delivery_location", "delivery_location TEXT");
ensureColumn("quotes", "notes", "notes TEXT");
ensureColumn("quotes", "additional_info", "additional_info TEXT");

ensureColumn("quotes", "objeto", "objeto TEXT");
ensureColumn("quotes", "missao", "missao TEXT");
ensureColumn("quotes", "escopo_tecnico", "escopo_tecnico TEXT");
ensureColumn("quotes", "segmentacao", "segmentacao TEXT");
ensureColumn("quotes", "investimento_texto", "investimento_texto TEXT");
ensureColumn("quotes", "condicoes_comerciais", "condicoes_comerciais TEXT");
ensureColumn("quotes", "assinatura_tecnica", "assinatura_tecnica TEXT");
ensureColumn("quotes", "forma_pagamento", "forma_pagamento TEXT");
ensureColumn("quotes", "validade_proposta", "validade_proposta TEXT");
ensureColumn("quotes", "observacoes", "observacoes TEXT");

ensureColumn("quote_items", "item_type", "item_type TEXT");
ensureColumn("quote_items", "icms", "icms REAL DEFAULT 0");
ensureColumn("quote_items", "issqn", "issqn REAL DEFAULT 0");

/* ===============================
   CALCULAR TOTAIS
================================ */

function calcTotalsFromPayload(items = []) {
  let subtotal = 0;
  let tax = 0;

  for (const item of items) {
    const qty = Number(item.quantity || 0);
    const price = Number(item.unit_price || 0);
    const total = Number(item.total_price ?? qty * price);

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
   LISTAR COTAÇÕES
================================ */

router.get("/", requireAuth, (req, res) => {
  try {
    const rows = db
      .prepare(
        `
        SELECT
          q.*,

          COALESCE((
            SELECT SUM(qi.total_price)
            FROM quote_items qi
            WHERE qi.quote_id = q.id
              AND UPPER(COALESCE(qi.item_type, '')) = 'PRODUTO'
          ), 0) AS total_produtos,

          COALESCE((
            SELECT SUM(qi.total_price)
            FROM quote_items qi
            WHERE qi.quote_id = q.id
              AND UPPER(COALESCE(qi.item_type, '')) IN ('SERVICO', 'SERVIÇO')
          ), 0) AS total_servicos,

          COALESCE((
            SELECT SUM(qi.total_price)
            FROM quote_items qi
            WHERE qi.quote_id = q.id
              AND UPPER(COALESCE(qi.item_type, '')) = 'SERVICO_SCM'
          ), 0) AS total_comodato,

          COALESCE((
            SELECT COUNT(*)
            FROM quote_items qi
            WHERE qi.quote_id = q.id
              AND UPPER(COALESCE(qi.item_type, '')) = 'PRODUTO'
          ), 0) AS qtd_itens_produtos,

          COALESCE((
            SELECT COUNT(*)
            FROM quote_items qi
            WHERE qi.quote_id = q.id
              AND UPPER(COALESCE(qi.item_type, '')) IN ('SERVICO', 'SERVIÇO')
          ), 0) AS qtd_itens_servicos,

          COALESCE((
            SELECT COUNT(*)
            FROM quote_items qi
            WHERE qi.quote_id = q.id
              AND UPPER(COALESCE(qi.item_type, '')) = 'SERVICO_SCM'
          ), 0) AS qtd_itens_comodato

        FROM quotes q
        ORDER BY q.created_at DESC
        `
      )
      .all();

    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e?.message || String(e) });
  }
});

/* ===============================
   BUSCAR UMA COTAÇÃO
================================ */

router.get("/:id", requireAuth, (req, res) => {
  try {
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
        `
      )
      .all(id);

    quote.items = items;

    res.json(quote);
  } catch (e) {
    res.status(500).json({ error: e?.message || String(e) });
  }
});

/* ===============================
   CRIAR COTAÇÃO
================================ */

router.post("/", requireAuth, (req, res) => {
  const data = req.body || {};
  const id = crypto.randomUUID();
  const now = Date.now();

  const items = Array.isArray(data.items) ? data.items : [];
  const totals = calcTotalsFromPayload(items);

  const trx = db.transaction(() => {
    db.prepare(
      `
      INSERT INTO quotes (
        id,
        proposal_number,
        revision,
        user_id,
        seller_id,
        company_id,
        company_name,
        company_document,
        client_id,
        client_name,
        client_document,
        contact_person,
        status,
        validity_date,
        payment_terms,
        freight_type,
        delivery_location,
        notes,
        additional_info,
        objeto,
        missao,
        escopo_tecnico,
        segmentacao,
        investimento_texto,
        condicoes_comerciais,
        assinatura_tecnica,
        forma_pagamento,
        validade_proposta,
        observacoes,
        subtotal,
        tax_total,
        total_value,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    ).run(
      id,
      data.proposal_number || "",
      Number(data.revision || 0),
      data.user_id || null,
      data.seller_id || null,
      data.company_id || null,
      data.company_name || "",
      data.company_document || "",
      data.client_id || null,
      data.client_name || "",
      data.client_document || "",
      data.contact_person || "",
      data.status || "pending",
      data.validity_date || "",
      data.payment_terms || "",
      data.freight_type || "",
      data.delivery_location || "",
      data.notes || "",
      data.additional_info || "",
      data.objeto || "",
      data.missao || "",
      data.escopo_tecnico || "",
      data.segmentacao || "",
      data.investimento_texto || "",
      data.condicoes_comerciais || "",
      data.assinatura_tecnica || "",
      data.forma_pagamento || "",
      data.validade_proposta || "",
      data.observacoes || "",
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
        item_type,
        code,
        description,
        unit,
        quantity,
        unit_price,
        total_price,
        icms,
        issqn
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    );

    for (const item of items) {
      const qty = Number(item.quantity || 0);
      const price = Number(item.unit_price || 0);
      const total = Number(item.total_price ?? qty * price);

      const icms = Number(item?.icms ?? item?.taxes?.icms ?? 0);
      const issqn = Number(item?.issqn ?? item?.taxes?.issqn ?? 0);

      insertItem.run(
        crypto.randomUUID(),
        id,
        item.product_id || item.id || null,
        item.item_type || "PRODUTO",
        item.code || "",
        item.description || "",
        item.unit || "un",
        qty,
        price,
        total,
        icms,
        issqn
      );
    }
  });

  try {
    trx();

    writeAuditLog({
      user: req.user,
      action: "create",
      entity: "quote",
      entity_id: id,
      details: {
        proposal_number: data.proposal_number || "",
        client_name: data.client_name || "",
        client_id: data.client_id || null,
        seller_id: data.seller_id || null,
        total_value: totals.total_value,
        items_count: items.length,
      },
    });

    res.json({ ok: true, id });
  } catch (e) {
    res.status(500).json({ error: e?.message || String(e) });
  }
});

/* ===============================
   ATUALIZAR COTAÇÃO
================================ */

router.put("/:id", requireAuth, (req, res) => {
  const id = req.params.id;
  const data = req.body || {};
  const now = Date.now();

  const items = Array.isArray(data.items) ? data.items : [];
  const totals = calcTotalsFromPayload(items);

  const previous = db.prepare(`SELECT * FROM quotes WHERE id = ?`).get(id);

  const trx = db.transaction(() => {
    const result = db
      .prepare(
        `
        UPDATE quotes
        SET
          proposal_number = ?,
          revision = ?,
          user_id = ?,
          seller_id = ?,
          company_id = ?,
          company_name = ?,
          company_document = ?,
          client_id = ?,
          client_name = ?,
          client_document = ?,
          contact_person = ?,
          status = ?,
          validity_date = ?,
          payment_terms = ?,
          freight_type = ?,
          delivery_location = ?,
          notes = ?,
          additional_info = ?,
          objeto = ?,
          missao = ?,
          escopo_tecnico = ?,
          segmentacao = ?,
          investimento_texto = ?,
          condicoes_comerciais = ?,
          assinatura_tecnica = ?,
          forma_pagamento = ?,
          validade_proposta = ?,
          observacoes = ?,
          subtotal = ?,
          tax_total = ?,
          total_value = ?,
          updated_at = ?
        WHERE id = ?
        `
      )
      .run(
        data.proposal_number || "",
        Number(data.revision || 0),
        data.user_id || null,
        data.seller_id || null,
        data.company_id || null,
        data.company_name || "",
        data.company_document || "",
        data.client_id || null,
        data.client_name || "",
        data.client_document || "",
        data.contact_person || "",
        data.status || "pending",
        data.validity_date || "",
        data.payment_terms || "",
        data.freight_type || "",
        data.delivery_location || "",
        data.notes || "",
        data.additional_info || "",
        data.objeto || "",
        data.missao || "",
        data.escopo_tecnico || "",
        data.segmentacao || "",
        data.investimento_texto || "",
        data.condicoes_comerciais || "",
        data.assinatura_tecnica || "",
        data.forma_pagamento || "",
        data.validade_proposta || "",
        data.observacoes || "",
        totals.subtotal,
        totals.tax_total,
        totals.total_value,
        now,
        id
      );

    if (result.changes === 0) {
      throw new Error("Cotação não encontrada");
    }

    db.prepare(
      `
      DELETE FROM quote_items
      WHERE quote_id = ?
      `
    ).run(id);

    const insertItem = db.prepare(
      `
      INSERT INTO quote_items (
        id,
        quote_id,
        product_id,
        item_type,
        code,
        description,
        unit,
        quantity,
        unit_price,
        total_price,
        icms,
        issqn
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    );

    for (const item of items) {
      const qty = Number(item.quantity || 0);
      const price = Number(item.unit_price || 0);
      const total = Number(item.total_price ?? qty * price);

      const icms = Number(item?.icms ?? item?.taxes?.icms ?? 0);
      const issqn = Number(item?.issqn ?? item?.taxes?.issqn ?? 0);

      insertItem.run(
        crypto.randomUUID(),
        id,
        item.product_id || item.id || null,
        item.item_type || "PRODUTO",
        item.code || "",
        item.description || "",
        item.unit || "un",
        qty,
        price,
        total,
        icms,
        issqn
      );
    }
  });

  try {
    trx();

    writeAuditLog({
      user: req.user,
      action: "update",
      entity: "quote",
      entity_id: id,
      details: {
        before: previous || null,
        after: {
          proposal_number: data.proposal_number || "",
          client_name: data.client_name || "",
          client_id: data.client_id || null,
          seller_id: data.seller_id || null,
          total_value: totals.total_value,
          items_count: items.length,
        },
      },
    });

    res.json({ ok: true, id });
  } catch (e) {
    res.status(500).json({ error: e?.message || String(e) });
  }
});

/* ===============================
   EXCLUIR COTAÇÃO
================================ */

router.delete("/:id", requireAuth, (req, res) => {
  const id = req.params.id;
  const previous = db.prepare(`SELECT * FROM quotes WHERE id = ?`).get(id);

  const trx = db.transaction(() => {
    db.prepare(`DELETE FROM quote_items WHERE quote_id = ?`).run(id);
    const result = db.prepare(`DELETE FROM quotes WHERE id = ?`).run(id);
    if (result.changes === 0) {
      throw new Error("Cotação não encontrada");
    }
  });

  try {
    trx();

    writeAuditLog({
      user: req.user,
      action: "delete",
      entity: "quote",
      entity_id: id,
      details: previous || null,
    });

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e?.message || String(e) });
  }
});

export default router;