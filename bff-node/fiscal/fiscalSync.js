// bff-node/api/fiscalSync.js
import express from "express";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// scripts (ajuste se mudar nomes)
const SCRIPTS = {
  NFE: path.join(__dirname, "..", "fiscal", "syncNfe.js"),
  CTE: path.join(__dirname, "..", "fiscal", "syncCte.js"),
  MDFE: path.join(__dirname, "..", "fiscal", "syncMdfe.js")
};

// POST /api/fiscal/sync?doc_type=NFE|CTE|MDFE
router.post("/fiscal/sync", requireAdmin, async (req, res) => {
  const docType = String(req.query.doc_type || "NFE").toUpperCase();
  const script = SCRIPTS[docType];

  if (!script) return res.status(400).json({ error: "doc_type inválido. Use NFE|CTE|MDFE" });

  const child = spawn(process.execPath, [script], {
    cwd: path.join(__dirname, ".."), // bff-node/
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"]
  });

  let out = "";
  let err = "";

  child.stdout.on("data", (d) => (out += d.toString()));
  child.stderr.on("data", (d) => (err += d.toString()));

  child.on("close", (code) => {
    // Se estiver offline/sem A1, seus scripts saem com code 0 e log “desativado”.
    return res.json({
      ok: code === 0,
      doc_type: docType,
      exit_code: code,
      stdout: out.trim(),
      stderr: err.trim()
    });
  });
});

export default router;