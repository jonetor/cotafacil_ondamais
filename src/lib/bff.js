const LS_TOKEN_KEY = "token";

export function getBffUrl() {
  return (import.meta.env.VITE_BFF_URL || "http://localhost:3000").replace(/\/$/, "");
}

export async function bffFetch(path, opts = {}) {
  const base = getBffUrl();
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;

  const token = localStorage.getItem(LS_TOKEN_KEY);

  // ✅ merge correto (não sobrescreve)
  const headers = {
    Accept: "application/json",
    ...(opts.headers || {}),
  };

  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, { ...opts, headers });
  const text = await res.text();

  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = null; }

  if (!res.ok) {
    const msg = (json && (json.message || json.error)) || text || `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.payload = json;
    throw err;
  }

  return json;
}

export async function bffGet(path) {
  return bffFetch(path, { method: "GET" });
}

export async function bffPost(path, body) {
  return bffFetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
}