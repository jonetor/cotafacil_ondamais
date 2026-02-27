// src/services/httpBff.js

export function getBffToken() {
  return localStorage.getItem("bff_token") || "";
}

export function setBffToken(token) {
  if (token) localStorage.setItem("bff_token", token);
}

export function clearBffAuth() {
  localStorage.removeItem("bff_token");
  localStorage.removeItem("bff_user");
}

/**
 * Wrapper de fetch:
 * - usa proxy do Vite chamando /api/...
 * - injeta Authorization automaticamente
 * - trata erros de forma consistente
 */
export async function bffFetch(path, options = {}) {
  const token = getBffToken();

  const headers = {
    ...(options.headers || {}),
  };

  // injeta token automaticamente (se existir)
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  // se tiver body JSON, garante content-type
  if (options.body && !(options.body instanceof FormData)) {
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
  }

  const r = await fetch(path.startsWith("/api") ? path : `/api${path}`, {
    ...options,
    headers,
  });

  const text = await r.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!r.ok) {
    const msg = data?.error || data?.message || `HTTP ${r.status}`;
    const err = new Error(msg);
    err.status = r.status;
    err.data = data;
    throw err;
  }

  return data;
}