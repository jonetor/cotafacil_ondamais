// bff-node/api/fiscalImport.js
import express from "express";
import multer from "multer";
import { db, onlyDigits } from "../db.js";
import { randomUUID } from "node:crypto";
import { parseNfeDocXml } from "../fiscal/parseNfe.js";
import { requireAdmin } from "../middleware/requireAdmin.js";

const router = express.Router();

// memória (não grava arquivo no disco)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024 // 15MB
  }
});

function getCompanyByCnpjDigits(cnpjDigits) {
  return db
    .prepare(`SELECT id, cnpj_digits, name FROM fiscal_companies WHERE cnpj_digits=?`)
    .get(cnpjDigits);
}

function upsertCompanyIfMissing(cnpjDigits) {
  // cria empresa fiscal automaticamente se ainda não existir
  const existing = getCompanyByCnpjDigits(cnpjDigits);
  if (existing) return existing;

  const id = randomUUID();
  const now = Date.now();
  db.prepare(`
    INSERT INTO fiscal_companies(id, cnpj, cnpj_digits, name, created_at, updated_at)
    VALUES(?,?,?,?,?,?)
  `).run(id, cnpjDigits, cnpjDigits, "Empresa fiscal", now, now);

  return getCompanyByCnpjDigits(cnpjDigits);
}

function insertImportedDoc({ companyId, docType, xml }) {
  const now = Date.now();

  // Por enquanto o parser aqui é NF-e (resNFe/procNFe).
  // CT-e/MDF-e: vamos criar parseCteDocXml/parseMdfeDocXml depois.
  // Mesmo assim, você já consegue guardar o XML.
  let parsed = {
    schema: "import",
    chave: null,
    emit_cnpj: null,
    dest_cnpj: null,
    dh_emi: null,
    valor: null,
    resumo_xml: xml,
    xml_completo: null
  };

  if (docType === "NFE") {
    parsed = parseNfeDocXml(xml);
  }

  // nsu "virtual" para import manual: usa timestamp (evita conflito)
  const nsu = now;

  db.prepare(`
    INSERT INTO fiscal_documents(
      id, company_id, doc_type, nsu, chave, schema, emit_cnpj, dest_cnpj, dh_emi, valor,
      resumo_xml, xml_completo, created_at, updated_at
    ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(company_id, doc_type, nsu) DO UPDATE SET
      updated_at=excluded.updated_at
  `).run(
    randomUUID(),
    companyId,
    docType,
    nsu,
    parsed.chave,
    parsed.schema,
    parsed.emit_cnpj,
    parsed.dest_cnpj,
    parsed.dh_emi,
    parsed.valor,
    parsed.resumo_xml,
    parsed.xml_completo,
    now,
    now
  );

  return { nsu, chave: parsed.chave, schema: parsed.schema };
}

/**
 * Upload de XML (somente ADMIN)
 * - multipart/form-data
 * - campo: file
 * - opcional:
 *   - doc_type: NFE|CTE|MDFE (default NFE)
 *   - company_cnpj: CNPJ destino (14 dígitos) para vincular no fiscal_companies
 */
router.post(
  "/fiscal/import/xml",
  requireAdmin,
  upload.single("file"),
  (req, res) => {
    try {
      if (!req.file?.buffer) return res.status(400).json({ error: "Arquivo não enviado (campo: file)" });

      const xml = req.file.buffer.toString("utf-8");
      const docType = String(req.body?.doc_type || "NFE").toUpperCase();

      if (!["NFE", "CTE", "MDFE"].includes(docType)) {
        return res.status(400).json({ error: "doc_type inválido. Use NFE|CTE|MDFE" });
      }

      const companyCnpjDigits = onlyDigits(String(req.body?.company_cnpj || ""));
      if (companyCnpjDigits.length !== 14) {
        return res
          .status(400)
          .json({ error: "company_cnpj inválido (informe CNPJ com 14 dígitos)" });
      }

      const company = upsertCompanyIfMissing(companyCnpjDigits);

      const out = insertImportedDoc({ companyId: company.id, docType, xml });

      return res.json({
        ok: true,
        company_id: company.id,
        doc_type: docType,
        ...out
      });
    } catch (e) {
      return res.status(500).json({ error: String(e?.message || e) });
    }
  }
);

export default router;