import express from "express";
import { db, onlyDigits } from "../db.js";
import { randomUUID } from "node:crypto";

const router = express.Router();

// cadastrar empresa fiscal (cnpj “vinculado”)
router.post("/fiscal/companies", (req, res) => {
  try {
    const cnpj = String(req.body?.cnpj || "");
    const name = String(req.body?.name || "");
    const cnpj_digits = onlyDigits(cnpj);

    if (cnpj_digits.length !== 14) {
      return res.status(400).json({ error: "CNPJ inválido" });
    }

    const now = Date.now();
    const id = randomUUID();

    db.prepare(`
      INSERT INTO fiscal_companies(id, cnpj, cnpj_digits, name, created_at, updated_at)
      VALUES(?,?,?,?,?,?)
      ON CONFLICT(cnpj_digits) DO UPDATE SET
        cnpj=excluded.cnpj,
        name=excluded.name,
        updated_at=excluded.updated_at
    `).run(id, cnpj, cnpj_digits, name, now, now);

    res.json({ ok: true, cnpj_digits });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

router.get("/fiscal/companies", (req, res) => {
  const rows = db.prepare(`SELECT * FROM fiscal_companies ORDER BY updated_at DESC`).all();
  res.json(rows);
});

router.get("/fiscal/docs", (req, res) => {
  const company_id = String(req.query.company_id || "");
  const doc_type = String(req.query.doc_type || "NFE"); // NFE|CTE|MDFE
  const limit = Math.min(Number(req.query.limit || 100), 500);

  const rows = db.prepare(`
    SELECT id, company_id, doc_type, nsu, chave, schema, emit_cnpj, dest_cnpj, dh_emi, valor, created_at, updated_at
    FROM fiscal_documents
    WHERE company_id=? AND doc_type=?
    ORDER BY nsu DESC
    LIMIT ?
  `).all(company_id, doc_type, limit);

  res.json({ total: rows.length, items: rows });
});

router.get("/fiscal/docs/:id/xml", (req, res) => {
  const id = String(req.params.id);
  const row = db.prepare(`SELECT resumo_xml, xml_completo FROM fiscal_documents WHERE id=?`).get(id);
  if (!row) return res.status(404).json({ error: "Documento não encontrado" });
  res.json({ xml: row.xml_completo || row.resumo_xml || "" });
});

export default router;