// bff-node/fiscal/config.js
import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// carrega env raiz e fallback
dotenv.config({ path: path.resolve(__dirname, "..", "..", ".env") });
dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

export const FISCAL_MODE = (process.env.FISCAL_MODE || "offline").toLowerCase(); // offline|online
export const FISCAL_ENV = process.env.FISCAL_ENV || "prod";

export const A1_PFX_PATH = process.env.A1_PFX_PATH || "";
export const A1_PFX_PASSWORD = process.env.A1_PFX_PASSWORD || "";

export const FISCAL_CUFAUTOR = process.env.FISCAL_CUFAUTOR || "35";
export const FISCAL_TPAMB = process.env.FISCAL_TPAMB || (FISCAL_ENV === "hom" ? "2" : "1");

export function hasA1() {
  return Boolean(A1_PFX_PATH && A1_PFX_PASSWORD && fs.existsSync(A1_PFX_PATH));
}

export function loadEndpoints() {
  const p = path.resolve(__dirname, "..", "webservice_endpoints.json");
  const raw = fs.readFileSync(p, "utf-8");
  const cfg = JSON.parse(raw);
  const env = cfg?.environments?.[FISCAL_ENV];
  if (!env) throw new Error(`FISCAL_ENV inválido: ${FISCAL_ENV}`);
  return env;
}