// bff-node/api/orcamentos.js
// Orçamentos: todos os vendedores veem todos os orçamentos.
// Ao criar, o vendedor é sempre o usuário logado (req.user).

import express from "express";
import { v4 as uuidv4 } from "uuid";
import { db } from "../db.js";
import { authRequired } from "./auth.js";

const router = express.Router();

// healthcheck
router.get("/orcamentos/health", (req, res) => {
  res.json({ ok: true });
});

// GET /api/orcamentos
// Lista todos (sem filtro por vendedor). Pode filtrar por status e q.
router.get("/orcamentos", authRequired, (req, res) => {
  try {
    const { status, q } = req.query;
    const where = [];
    const params = {};

    if (status) {
      where.push("status = @status");
      params.status = String(status);
    }

    if (q) {
      // busca simples em notes e customer_id
      where.push("(notes LIKE @q OR customer_id LIKE @q)");
      params.q = `%${String(q)}%`;
    }

    const sql = `
      SELECT
        id, customer_id, status, notes,
        seller_id, seller_name, seller_email,
        subtotal, discount_total, tax_total, freight_total, total,
        created_at, updated_at
      FROM budgets
      ${where.length ? "WHERE " + where.join(" AND ") : ""}
      ORDER BY created_at DESC
    `;

    const items = db.prepare(sql).all(params);
    res.json({ ok: true, items });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

// GET /api/orcamentos/:id
router.get("/orcamentos/:id", authRequired, (req, res) => {
  try {
    const id = req.params.id;
    const item = db
      .prepare(
        `
      SELECT
        id, customer_id, status, notes,
        seller_id, seller_name, seller_email,
        subtotal, discount_total, tax_total, freight_total, total,
        created_at, updated_at
      FROM budgets
      WHERE id = ?
      LIMIT 1
    `
      )
      .get(id);

    if (!item) return res.status(404).json({ error: "Orçamento não encontrado" });
    res.json({ ok: true, item });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

// POST /api/orcamentos
// Body (mínimo): { customer_id?, notes?, freight_total? }
router.post("/orcamentos", authRequired, (req, res) => {
  try {
    const body = req.body || {};
    const id = uuidv4();
    const now = Date.now();

    // ✅ vendedor vem SEMPRE do token
    const seller_id = req.user.sub;
    const seller_name = req.user.name;
    const seller_email = req.user.email;

    const customer_id = body.customer_id ? String(body.customer_id) : null;
    const notes = body.notes ? String(body.notes) : null;
    const freight_total = Number(body.freight_total || 0);

    // totais (por enquanto simples)
    const subtotal = Number(body.subtotal || 0);
    const discount_total = Number(body.discount_total || 0);
    const tax_total = Number(body.tax_total || 0);
    const total = Math.max(0, subtotal - discount_total + tax_total + freight_total);

    db.prepare(`
      INSERT INTO budgets (
        id, customer_id, status, notes,
        seller_id, seller_name, seller_email,
        subtotal, discount_total, tax_total, freight_total, total,
        created_at, updated_at
      ) VALUES (
        ?, ?, 'draft', ?,
        ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?
      )
    `).run(
      id,
      customer_id,
      notes,
      seller_id,
      seller_name,
      seller_email,
      subtotal,
      discount_total,
      tax_total,
      freight_total,
      total,
      now,
      now
    );

    const created = db
      .prepare(
        `
      SELECT
        id, customer_id, status, notes,
        seller_id, seller_name, seller_email,
        subtotal, discount_total, tax_total, freight_total, total,
        created_at, updated_at
      FROM budgets
      WHERE id = ?
    `
      )
      .get(id);

    res.status(201).json({ ok: true, item: created });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

// PATCH /api/orcamentos/:id
// Atualiza alguns campos (sem trocar vendedor)
router.patch("/orcamentos/:id", authRequired, (req, res) => {
  try {
    const id = req.params.id;
    const body = req.body || {};
    const now = Date.now();

    const current = db.prepare(`SELECT id FROM budgets WHERE id=? LIMIT 1`).get(id);
    if (!current) return res.status(404).json({ error: "Orçamento não encontrado" });

    const customer_id = body.customer_id === undefined ? undefined : body.customer_id ? String(body.customer_id) : null;
    const notes = body.notes === undefined ? undefined : body.notes ? String(body.notes) : null;
    const status = body.status === undefined ? undefined : String(body.status);

    // (recalcula totais se vierem)
    const subtotal = body.subtotal === undefined ? undefined : Number(body.subtotal || 0);
    const discount_total = body.discount_total === undefined ? undefined : Number(body.discount_total || 0);
    const tax_total = body.tax_total === undefined ? undefined : Number(body.tax_total || 0);
    const freight_total = body.freight_total === undefined ? undefined : Number(body.freight_total || 0);

    // Para recalcular total sem depender do que não veio, pegamos o atual
    const prev = db.prepare(`SELECT subtotal, discount_total, tax_total, freight_total FROM budgets WHERE id=?`).get(id);
    const finalSubtotal = subtotal === undefined ? Number(prev.subtotal || 0) : subtotal;
    const finalDiscount = discount_total === undefined ? Number(prev.discount_total || 0) : discount_total;
    const finalTax = tax_total === undefined ? Number(prev.tax_total || 0) : tax_total;
    const finalFreight = freight_total === undefined ? Number(prev.freight_total || 0) : freight_total;
    const total = Math.max(0, finalSubtotal - finalDiscount + finalTax + finalFreight);

    db.prepare(`
      UPDATE budgets
      SET
        customer_id = COALESCE(?, customer_id),
        notes = COALESCE(?, notes),
        status = COALESCE(?, status),
        subtotal = COALESCE(?, subtotal),
        discount_total = COALESCE(?, discount_total),
        tax_total = COALESCE(?, tax_total),
        freight_total = COALESCE(?, freight_total),
        total = ?,
        updated_at = ?
      WHERE id = ?
    `).run(
      customer_id === undefined ? null : customer_id,
      notes === undefined ? null : notes,
      status === undefined ? null : status,
      subtotal === undefined ? null : subtotal,
      discount_total === undefined ? null : discount_total,
      tax_total === undefined ? null : tax_total,
      freight_total === undefined ? null : freight_total,
      total,
      now,
      id
    );

    const updated = db
      .prepare(
        `
      SELECT
        id, customer_id, status, notes,
        seller_id, seller_name, seller_email,
        subtotal, discount_total, tax_total, freight_total, total,
        created_at, updated_at
      FROM budgets
      WHERE id=?
    `
      )
      .get(id);

    res.json({ ok: true, item: updated });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

export default router;
