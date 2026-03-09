import express from "express";
import { db } from "../db.js";
import { requireAuth, requireAdmin } from "./auth.js";

const router = express.Router();

router.get("/audit", requireAuth, requireAdmin, (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT *
      FROM audit_logs
      ORDER BY created_at DESC
      LIMIT 500
    `).all();

    const items = rows.map((r) => ({
      ...r,
      details: r.details ? JSON.parse(r.details) : null,
    }));

    res.json({ ok: true, items });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

export default router;