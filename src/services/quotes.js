// src/services/quotes.js
async function apiFetch(path, options = {}) {
  const resp = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const text = await resp.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!resp.ok) {
    const msg = data?.error || data?.message || text || `HTTP ${resp.status}`;
    throw new Error(msg);
  }

  return data;
}

export async function listQuotes() {
  return apiFetch("/api/quotes");
}

export async function getQuote(id) {
  return apiFetch(`/api/quotes/${encodeURIComponent(id)}`);
}

export async function createQuote(payload) {
  return apiFetch("/api/quotes", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateQuote(id, payload) {
  return apiFetch(`/api/quotes/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteQuote(id) {
  return apiFetch(`/api/quotes/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}