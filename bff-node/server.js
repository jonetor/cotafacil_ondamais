import "./env.js";

import express from "express";
import cors from "cors";

import { initDb, db, onlyDigits, norm } from "./db.js";

import { seedAdmin } from "./seedAdmin.js";
import { syncVoalleClients } from "./voalleSync.js";

import authRoutes from "./api/auth.js";
import orcamentosRoutes from "./api/orcamentos.js";
import productsRoutes from "./api/products.js";
import quotesRoutes from "./api/quotes.js";

import { initQuotesDb } from "./quotesDb.js";

import fiscalRoutes from "./api/fiscal.js";
import fiscalImportRoutes from "./api/fiscalImport.js";

//import fiscalSyncRoutes from "./api/fiscalSync.js";
import companiesRoutes from "./api/companies.js";
import commissionRoutes from "./api/commission.js";
import salesRoutes from "./api/sales.js";




const app = express();

/* ===============================
   CORS
================================ */

app.use("/api", fiscalRoutes);
app.use("/api", fiscalImportRoutes);
//app.use("/api", fiscalSyncRoutes);
app.use("/api/companies", companiesRoutes);
app.use("/api", commissionRoutes);
app.use("/api", salesRoutes);


app.use(
  cors({
    origin: true,
    credentials: true
  })
);

app.use(express.json({ limit: "5mb" }));

/* ===============================
   HEALTHCHECK
================================ */

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

/* ===============================
   INIT DATABASE
================================ */

initDb();
initQuotesDb();

seedAdmin().catch((err) => {
  console.error("Erro seedAdmin:", err?.message || err);
});

/* ===============================
   ROUTES
================================ */

app.use("/api/auth", authRoutes);

app.use("/api", orcamentosRoutes);

app.use("/api", productsRoutes);

app.use("/api/quotes", quotesRoutes);

/* ===============================
   VOALLE TOKEN CACHE
================================ */

let cachedToken = null;
let tokenExpiresAt = 0;

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

async function getToken() {

  const now = Date.now();

  if (cachedToken && now < tokenExpiresAt) {
    return cachedToken;
  }

  const authUrl = process.env.VOALLE_AUTH_URL;

  if (!authUrl) {
    throw new Error("VOALLE_AUTH_URL não configurado");
  }

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

  if (!resp.ok) {
    throw new Error(`Auth failed (${resp.status}): ${text}`);
  }

  const data = safeJsonParse(text);

  if (!data.access_token) {
    throw new Error("Token Voalle inválido");
  }

  cachedToken = data.access_token;

  const expires = Number(data.expires_in || 300);

  tokenExpiresAt = Date.now() + (expires - 30) * 1000;

  return cachedToken;
}

/* ===============================
   TESTE TOKEN
================================ */

app.post("/api/voalle/token", async (req, res) => {

  try {

    const token = await getToken();

    res.json({
      ok: true,
      hasToken: !!token
    });

  } catch (err) {

    res.status(500).json({
      error: String(err?.message || err)
    });

  }

});

/* ===============================
   SYNC CLIENTES
================================ */

app.post("/api/voalle/sync-clientes", async (req, res) => {

  try {

    const baseUrl = process.env.VOALLE_BASE_URL;

    if (!baseUrl) {
      throw new Error("VOALLE_BASE_URL não configurado");
    }

    const pageSize = 5000;

    const result = await syncVoalleClients({
      getToken,
      baseUrl,
      pageSize
    });

    res.json(result);

  } catch (err) {

    res.status(500).json({
      error: String(err?.message || err)
    });

  }

});

/* ===============================
   CLIENTES CACHE SQLITE
================================ */

app.get("/api/voalle/clientes-db", (req, res) => {

  try {

    const q = String(req.query.q || "").trim();
    const limit = Math.min(Number(req.query.limit || 50), 200);

    if (!q) {

      const rows = db.prepare(`
        SELECT *
        FROM voalle_clients
        ORDER BY updated_at DESC
        LIMIT ?
      `).all(limit);

      return res.json({
        total: rows.length,
        items: rows
      });

    }

    const qDigits = onlyDigits(q);
    const qNorm = norm(q);

    let rows = [];

    if (qDigits) {

      rows = db.prepare(`
        SELECT *
        FROM voalle_clients
        WHERE cpf_cnpj_digits LIKE ?
        LIMIT ?
      `).all(`%${qDigits}%`, limit);

    } else {

      rows = db.prepare(`
        SELECT *
        FROM voalle_clients
        WHERE lower(nome_razao) LIKE ?
        OR lower(nome_fantasia) LIKE ?
        LIMIT ?
      `).all(`%${qNorm}%`, `%${qNorm}%`, limit);

    }

    res.json({
      total: rows.length,
      items: rows
    });

  } catch (err) {

    res.status(500).json({
      error: String(err?.message || err)
    });

  }

});

/* ===============================
   404
================================ */

app.use((req, res) => {
  res.status(404).json({
    error: "Rota não encontrada"
  });
});

/* ===============================
   ERROR HANDLER
================================ */

app.use((err, req, res, next) => {

  const status = Number(err?.status || 500);
  const msg = String(err?.message || err);

  console.error("[BFF ERROR]", msg);

  res.status(status).json({
    error: msg
  });

});

/* ===============================
   START SERVER
================================ */

const PORT = Number(process.env.PORT || 3000);

app.listen(PORT, () => {
  console.log(`BFF rodando em http://localhost:${PORT}`);
});

/* ===============================
   PROCESS HANDLERS
================================ */

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});