import axios from "axios";

/**
 * Voalle API access THROUGH a backend proxy (BFF).
 *
 * ✅ Use a BFF so you don't expose credentials in the browser and to avoid CORS.
 *
 * Default: relative "/api" (ideal when your front and BFF are under the same domain)
 * Override locally: create .env.local with VITE_BFF_BASE_URL=http://localhost:3001
 */

const API_BASE = import.meta.env.VITE_BFF_BASE_URL || "/api";

export const voalleHttp = axios.create({
  baseURL: `${API_BASE}/voalle`,
  timeout: 30_000,
});

// ---- Helpers ----

function normalizeError(error) {
  const status = error?.response?.status;
  const data = error?.response?.data;

  // Try to extract a good message
  const message =
    data?.message ||
    data?.error ||
    (typeof data === "string" ? data : null) ||
    error?.message ||
    "Erro desconhecido";

  return { status, message, raw: data };
}

// ---- API (through BFF routes) ----

/**
 * GET /api/voalle/health
 */
export async function voalleHealth() {
  try {
    const { data } = await voalleHttp.get(`/health`);
    return data;
  } catch (e) {
    throw normalizeError(e);
  }
}

/**
 * Example: GET /api/voalle/clientes?search=...&limit=...
 * Adjust endpoint names according to your BFF mapping.
 */
export async function voalleListClientes(params = {}) {
  try {
    const { data } = await voalleHttp.get(`/clientes`, { params });
    return data;
  } catch (e) {
    throw normalizeError(e);
  }
}

/**
 * Generic passthrough helper (useful while you are mapping endpoints).
 * Example: voalleGet('/contratos', { clienteId: 10 })
 */
export async function voalleGet(path, params = {}) {
  try {
    const { data } = await voalleHttp.get(path, { params });
    return data;
  } catch (e) {
    throw normalizeError(e);
  }
}
