// bff-node/server.js
import "./env.js";
import express from "express";
import cors from "cors";

import { initDb, db, onlyDigits, norm } from "./db.js";
import { seedAdmin } from "./seedAdmin.js";
import { syncVoalleClients } from "./voalleSync.js";
import authRoutes from "./api/auth.js";
import orcamentosRoutes from "./api/orcamentos.js";
import productsRoutes from "./api/products.js";

// ⚠️ ENV já é carregado em ./env.js (mantém um único ponto de leitura do .env)

// ================== APP INIT ==================
const app = express();
// ✅ libera chamadas do front (Vite) para o BFF
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept", "Key"],
  })
);
app.use(express.json());

// healthcheck simples
app.get("/api/health", (req, res) => res.json({ ok: true }));

// ================== DB INIT ==================
initDb();

// garante admin padrão
seedAdmin().catch((e) => {
  console.error("[seedAdmin] ERRO:", e?.message || e);
});

// ================== ROTAS ==================
app.use("/api/auth", authRoutes);
app.use("/api", orcamentosRoutes);
app.use("/api", productsRoutes); // ✅ AGORA NO LUGAR CORRETO

// ================== TOKEN CACHE VOALLE ==================
let cachedToken = null;
let tokenExpiresAt = 0;

async function getToken() {
  const now = Date.now();
  if (cachedToken && now < tokenExpiresAt) return cachedToken;

  const authUrl = process.env.VOALLE_AUTH_URL;
  if (!authUrl) throw new Error("VOALLE_AUTH_URL não configurado (verifique seu .env)");

  const body = new URLSearchParams({
    grant_type: process.env.VOALLE_GRANT_TYPE || "client_credentials",
    scope: process.env.VOALLE_SCOPE || "syngw",
    client_id: process.env.VOALLE_CLIENT_ID || "",
    client_secret: process.env.VOALLE_CLIENT_SECRET || "",
    syndata: process.env.VOALLE_SYNDATA || ""
  });

  const resp = await fetch(authUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });

  const text = await resp.text();
  if (!resp.ok) throw new Error(`Auth failed (${resp.status}): ${text}`);

  const data = JSON.parse(text);

  cachedToken = data.access_token;

  const expiresInSec = Number(data.expires_in || 300);
  tokenExpiresAt = Date.now() + Math.max(0, (expiresInSec - 30)) * 1000;

  return cachedToken;
}

// ================== TESTE TOKEN ==================
app.post("/api/voalle/token", async (req, res) => {
  try {
    const token = await getToken();
    res.json({ ok: true, hasToken: !!token });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

// ================== SYNC CLIENTES ==================
app.post("/api/voalle/sync-clientes", async (req, res) => {
  try {
    const baseUrl = process.env.VOALLE_BASE_URL;
    if (!baseUrl) throw new Error("VOALLE_BASE_URL não configurado");

    const pageSize = Number(req.query.pageSize || 5000);

    const result = await syncVoalleClients({
      getToken,
      baseUrl,
      pageSize
    });

    res.json(result);
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

// ================== CACHE CLIENTES (SQLite) ==================
app.get("/api/voalle/clientes-db", (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    const limit = Math.min(Number(req.query.limit || 50), 200);

    if (!q) {
      const rows = db
        .prepare(`SELECT * FROM voalle_clients ORDER BY updated_at DESC LIMIT ?`)
        .all(limit);
      return res.json({ total: rows.length, items: rows });
    }

    const qDigits = onlyDigits(q);
    const qNorm = norm(q);

    let rows = [];

    if (qDigits) {
      rows = db
        .prepare(
          `SELECT * FROM voalle_clients
           WHERE cpf_cnpj_digits LIKE ?
           ORDER BY updated_at DESC
           LIMIT ?`
        )
        .all(`%${qDigits}%`, limit);
    } else {
      rows = db
        .prepare(
          `SELECT * FROM voalle_clients
           WHERE lower(nome_razao) LIKE ? OR lower(nome_fantasia) LIKE ?
           ORDER BY updated_at DESC
           LIMIT ?`
        )
        .all(`%${qNorm}%`, `%${qNorm}%`, limit);
    }

    res.json({ total: rows.length, items: rows });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

// ================== START SERVER ==================
const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, () => {
  console.log(`✅ BFF rodando em http://localhost:${PORT}`);
});