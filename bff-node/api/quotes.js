// bff-node/api/quotes.js
import express from "express";
import crypto from "node:crypto";
import { getQuotesDb } from "../quotesDb.js";

const router = express.Router();

const nowIso = () => new Date().toISOString();
const genId = () => crypto.randomUUID();

function asNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function parseTaxesJson(s) {
  try {
    return s ? JSON.parse(s) : {};
  } catch {
    return {};
  }
}

function loadQuoteWithItems(db, id) {
  const q = db.prepare(`SELECT * FROM quotes WHERE id = ?`).get(id);
  if (!q) return null;

  const items = db
    .prepare(`SELECT * FROM quote_items WHERE quote_id = ? ORDER BY created_at ASC`)
    .all(id)
    .map((it) => ({ ...it, taxes: parseTaxesJson(it.taxes_json) }));

  return { ...q, items };
}

router.get("/", (req, res) => {
  try {
    const db = getQuotesDb();
    const rows = db.prepare(`SELECT * FROM quotes ORDER BY created_at DESC`).all();

    const itemStmt = db.prepare(
      `SELECT * FROM quote_items WHERE quote_id = ? ORDER BY created_at ASC`
    );

    const quotes = rows.map((q) => {
      const items = itemStmt.all(q.id).map((it) => ({
        ...it,
        taxes: parseTaxesJson(it.taxes_json),
      }));
      return { ...q, items };
    });

    res.json(quotes);
  } catch (e) {
    console.error("[GET /api/quotes]", e);
    res.status(500).json({ error: String(e?.message || e) });
  }
});

router.get("/:id", (req, res) => {
  try {
    const db = getQuotesDb();
    const data = loadQuoteWithItems(db, req.params.id);
    if (!data) return res.status(404).json({ error: "Not found" });
    res.json(data);
  } catch (e) {
    console.error("[GET /api/quotes/:id]", e);
    res.status(500).json({ error: String(e?.message || e) });
  }
});

function upsertQuoteTx(db, payload) {
  const quoteId = payload.id || genId();
  const createdAt = payload.created_at || nowIso();
  const updatedAt = nowIso();
  const items = Array.isArray(payload.items) ? payload.items : [];

  const quoteRow = {
    id: quoteId,

    proposal_number: String(payload.proposal_number || ""),
    revision: asNumber(payload.revision || 0),
    status: String(payload.status || "pending"),

    created_at: createdAt,
    updated_at: updatedAt,

    user_id: String(payload.user_id || ""),
    seller_id: String(payload.seller_id || ""),

    company_id: String(payload.company_id || ""),
    client_id: String(payload.client_id || ""),

    company_source: String(payload.company_source || "internal"),
    client_source: String(payload.client_source || "internal"),
    client_external_id: String(payload.client_external_id || ""),

    company_name: String(payload.company_name || ""),
    company_document: String(payload.company_document || ""),

    client_name: String(payload.client_name || ""),
    client_document: String(payload.client_document || ""),

    contact_person: String(payload.contact_person || ""),

    validity_date: String(payload.validity_date || ""),
    payment_terms: String(payload.payment_terms || ""),
    freight_type: String(payload.freight_type || ""),
    delivery_location: String(payload.delivery_location || ""),
    notes: String(payload.notes || ""),

    total_value: asNumber(payload.total_value || 0),
  };

  const insertOrUpdateQuote = db.prepare(`
    INSERT INTO quotes (
      id, proposal_number, revision, status,
      created_at, updated_at,
      user_id, seller_id,
      company_id, client_id,
      company_source, client_source, client_external_id,
      company_name, company_document,
      client_name, client_document,
      contact_person,
      validity_date, payment_terms, freight_type, delivery_location, notes,
      total_value
    ) VALUES (
      @id, @proposal_number, @revision, @status,
      @created_at, @updated_at,
      @user_id, @seller_id,
      @company_id, @client_id,
      @company_source, @client_source, @client_external_id,
      @company_name, @company_document,
      @client_name, @client_document,
      @contact_person,
      @validity_date, @payment_terms, @freight_type, @delivery_location, @notes,
      @total_value
    )
    ON CONFLICT(id) DO UPDATE SET
      proposal_number=excluded.proposal_number,
      revision=excluded.revision,
      status=excluded.status,
      updated_at=excluded.updated_at,
      user_id=excluded.user_id,
      seller_id=excluded.seller_id,
      company_id=excluded.company_id,
      client_id=excluded.client_id,
      company_source=excluded.company_source,
      client_source=excluded.client_source,
      client_external_id=excluded.client_external_id,
      company_name=excluded.company_name,
      company_document=excluded.company_document,
      client_name=excluded.client_name,
      client_document=excluded.client_document,
      contact_person=excluded.contact_person,
      validity_date=excluded.validity_date,
      payment_terms=excluded.payment_terms,
      freight_type=excluded.freight_type,
      delivery_location=excluded.delivery_location,
      notes=excluded.notes,
      total_value=excluded.total_value
  `);

  const deleteItems = db.prepare(`DELETE FROM quote_items WHERE quote_id = ?`);

  const insertItem = db.prepare(`
    INSERT INTO quote_items (
      id, quote_id,
      item_id, item_type,
      code, description, unit,
      quantity, unit_price, total_price,
      taxes_json,
      created_at, updated_at
    ) VALUES (
      @id, @quote_id,
      @item_id, @item_type,
      @code, @description, @unit,
      @quantity, @unit_price, @total_price,
      @taxes_json,
      @created_at, @updated_at
    )
  `);

  const tx = db.transaction(() => {
    insertOrUpdateQuote.run(quoteRow);
    deleteItems.run(quoteId);

    const t = nowIso();
    for (const it of items) {
      insertItem.run({
        id: it.id || genId(),
        quote_id: quoteId,

        item_id: it.item_id ? String(it.item_id) : "",
        item_type: String(it.item_type || ""),

        code: String(it.code || ""),
        description: String(it.description || ""),
        unit: String(it.unit || ""),

        quantity: asNumber(it.quantity || 0),
        unit_price: asNumber(it.unit_price || 0),
        total_price: asNumber(it.total_price || 0),

        taxes_json: JSON.stringify(it.taxes || {}),

        created_at: it.created_at || t,
        updated_at: t,
      });
    }
  });

  tx();
  return quoteId;
}

router.post("/", (req, res) => {
  try {
    const db = getQuotesDb();
    const payload = req.body || {};
    const quoteId = upsertQuoteTx(db, payload);

    const saved = loadQuoteWithItems(db, quoteId);
    res.json(saved);
  } catch (e) {
    console.error("[POST /api/quotes]", e);
    res.status(500).json({ error: String(e?.message || e) });
  }
});

router.put("/:id", (req, res) => {
  try {
    const db = getQuotesDb();
    const payload = { ...(req.body || {}), id: req.params.id };
    const quoteId = upsertQuoteTx(db, payload);

    const saved = loadQuoteWithItems(db, quoteId);
    res.json(saved);
  } catch (e) {
    console.error("[PUT /api/quotes/:id]", e);
    res.status(500).json({ error: String(e?.message || e) });
  }
});

router.delete("/:id", (req, res) => {
  try {
    const db = getQuotesDb();
    db.prepare(`DELETE FROM quotes WHERE id = ?`).run(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    console.error("[DELETE /api/quotes/:id]", e);
    res.status(500).json({ error: String(e?.message || e) });
  }
});

export default router;