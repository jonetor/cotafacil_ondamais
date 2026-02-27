// voalle_front/src/services/sellers.js

function getBffToken() {
  const token = localStorage.getItem("bff_token");
  if (!token) throw new Error("Token ausente (faça login novamente).");
  return token;
}

async function readJsonOrThrow(res) {
  const ct = (res.headers.get("content-type") || "").toLowerCase();
  const text = await res.text();

  const looksHtml =
    ct.includes("text/html") ||
    text.trim().startsWith("<!DOCTYPE") ||
    text.trim().startsWith("<html");

  if (looksHtml) {
    throw new Error(
      `Servidor retornou HTML (${res.status}) para ${res.url}. ` +
      `Provável rota errada (404) ou proxy quebrado.`
    );
  }

  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(
      `Resposta inválida (não é JSON) em ${res.url}. ` +
      `Conteúdo (200 chars): ${text.slice(0, 200)}`
    );
  }

  if (!res.ok) {
    throw new Error(data?.error || `Erro HTTP (${res.status}) em ${res.url}`);
  }

  return data;
}

// GET /api/auth/sellers
export async function listSellers() {
  const token = getBffToken();

  const res = await fetch("/api/auth/sellers", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await readJsonOrThrow(res);

  const items = Array.isArray(data) ? data : data?.items;
  if (!Array.isArray(items)) {
    throw new Error("Resposta inesperada em /api/auth/sellers (items não é array).");
  }

  return items;
}

// POST /api/auth/users (ADMIN)
export async function adminCreateUser({ email, name, password, role = "seller" }) {
  const token = getBffToken();

  const res = await fetch("/api/auth/users", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ email, name, password, role }),
  });

  const data = await readJsonOrThrow(res);

  if (!data?.ok) {
    throw new Error(data?.error || "Falha ao criar usuário (resposta sem ok=true).");
  }

  return data.user;
}