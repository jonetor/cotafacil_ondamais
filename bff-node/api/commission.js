// bff-node/api/commission.js
import express from "express";
import { db } from "../db.js";
import { requireAuth, requireAdmin } from "./auth.js";

const router = express.Router();

/**
 * Uma linha "default" com 3 percentuais:
 * - product_percent
 * - service_percent
 * - scm_percent
 */
db.exec(`
CREATE TABLE IF NOT EXISTS commission_settings (
  id TEXT PRIMARY KEY,
  product_percent REAL NOT NULL DEFAULT 0,
  service_percent REAL NOT NULL DEFAULT 0,
  scm_percent REAL NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);
`);

function ensureDefaultRow() {
  const row = db.prepare(`SELECT * FROM commission_settings WHERE id='default'`).get();
  if (row) return row;

  const now = Date.now();
  db.prepare(`
    INSERT INTO commission_settings (id, product_percent, service_percent, scm_percent, updated_at)
    VALUES ('default', 0, 0, 0, ?)
  `).run(now);

  return db.prepare(`SELECT * FROM commission_settings WHERE id='default'`).get();
}

// GET /api/commission-settings  (admin)
router.get("/commission-settings", requireAuth, requireAdmin, (req, res) => {
  const settings = ensureDefaultRow();
  res.json({ ok: true, settings });
});

// PUT /api/commission-settings  (admin)
router.put("/commission-settings", requireAuth, requireAdmin, (req, res) => {
  const now = Date.now();
  const body = req.body || {};

  const product = Number(body.product_percent ?? body.productPercent ?? 0);
  const service = Number(body.service_percent ?? body.servicePercent ?? 0);
  const scm = Number(body.scm_percent ?? body.scmPercent ?? 0);

  db.prepare(`
    INSERT INTO commission_settings (id, product_percent, service_percent, scm_percent, updated_at)
    VALUES ('default', ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      product_percent=excluded.product_percent,
      service_percent=excluded.service_percent,
      scm_percent=excluded.scm_percent,
      updated_at=excluded.updated_at
  `).run(product, service, scm, now);

  res.json({ ok: true, settings: ensureDefaultRow() });
});

export default router;