export function getBffToken() {
  return localStorage.getItem("bff_token") || "";
}

export async function bffFetch(path, options = {}) {
  const token = getBffToken();

  const headers = {
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const r = await fetch(path, { ...options, headers });

  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data?.error || `HTTP ${r.status}`);

  return data;
}