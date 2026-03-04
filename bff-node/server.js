// bff-node/server.js
import "./env.js";
import express from "express";
import cors from "cors";

// DB / utils
import { initDb, db, onlyDigits, norm } from "./db.js";

// Seeds / sync
import { seedAdmin } from "./seedAdmin.js";
import { syncVoalleClients } from "./voalleSync.js";

// Rotas
import authRoutes from "./api/auth.js";
import orcamentosRoutes from "./api/orcamentos.js";
import productsRoutes from "./api/products.js";
import quotesRoutes from "./api/quotes.js";

import { initQuotesDb } from "./quotesDb.js";

// ================== APP INIT ==================
const app = express();

// --- CORS ---
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept", "Key"],
  })
);

app.use(express.json({ limit: "5mb" }));

// healthcheck simples
app.get("/api/health", (req, res) => res.json({ ok: true }));

// ================== DB INIT ==================
initDb();
initQuotesDb();

// garante admin padrão (não derruba o server se falhar)
seedAdmin().catch((e) => {
  console.error("[seedAdmin] ERRO:", e?.message || e);
});

// ================== ROTAS ==================
app.use("/api/auth", authRoutes);
app.use("/api", orcamentosRoutes);
app.use("/api", productsRoutes);

// ✅ Quotes no banco próprio do BFF
app.use("/api/quotes", quotesRoutes);

// ================== TOKEN CACHE VOALLE ==================
let cachedToken = null;
let tokenExpiresAt = 0;

function safeJsonParse(text) {
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text };
  }
}

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
    syndata: process.env.VOALLE_SYNDATA || "",
  });

  const resp = await fetch(authUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const text = await resp.text();
  if (!resp.ok) throw new Error(`Auth failed (${resp.status}): ${text}`);

  const data = safeJsonParse(text);
  if (!data?.access_token) throw new Error(`Auth response sem access_token: ${text}`);

  cachedToken = data.access_token;
  const expiresInSec = Number(data.expires_in || 300);
  tokenExpiresAt = Date.now() + Math.max(0, expiresInSec - 30) * 1000;

  return cachedToken;
}

// ================== TESTE TOKEN ==================
app.post("/api/voalle/token", async (req, res) => {
  try {
    const token = await getToken();
    res.json({ ok: true, hasToken: !!token });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// ================== SYNC CLIENTES ==================
app.post("/api/voalle/sync-clientes", async (req, res) => {
  try {
    const baseUrl = process.env.VOALLE_BASE_URL;
    if (!baseUrl) throw new Error("VOALLE_BASE_URL não configurado");

    const pageSize = Math.min(Math.max(Number(req.query.pageSize || 5000), 100), 10000);

    const result = await syncVoalleClients({
      getToken,
      baseUrl,
      pageSize,
    });

    res.json(result);
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// ================== CACHE CLIENTES (SQLite) ==================
app.get("/api/voalle/clientes-db", (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    const limit = Math.min(Number(req.query.limit || 50), 200);

    if (!q) {
      const rows = db.prepare(`SELECT * FROM voalle_clients ORDER BY updated_at DESC LIMIT ?`).all(limit);
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
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// ================== 404 ==================
app.use((req, res) => {
  res.status(404).json({ error: "Rota não encontrada" });
});

// ================== ERROR HANDLER GLOBAL ==================
app.use((err, req, res, next) => {
  const name = err?.name || "";
  const msg = String(err?.message || err || "Erro interno");

  if (name === "TokenExpiredError" || name === "JsonWebTokenError" || name === "NotBeforeError") {
    return res.status(401).json({ error: "Token inválido ou expirado" });
  }

  const status = Number(err?.status || err?.statusCode || 500);
  console.error("[BFF ERROR]", status, msg);
  return res.status(status).json({ error: msg });
});

// ================== START SERVER ==================
const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, () => console.log(`✅ BFF rodando em http://localhost:${PORT}`));

process.on("unhandledRejection", (reason) => console.error("[unhandledRejection]", reason));
process.on("uncaughtException", (err) => console.error("[uncaughtException]", err));