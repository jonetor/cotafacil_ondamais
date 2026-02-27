// src/services/bffUsers.js

function getToken() {
  const token = localStorage.getItem("bff_token");
  if (!token) throw new Error("Token ausente (faça login novamente).");
  return token;
}

async function asJson(res) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text };
  }
}

// ✅ quem está logado (para saber se é admin)
export async function getBffMe() {
  const token = getToken();

  const res = await fetch("/api/auth/me", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await asJson(res);

  if (!res.ok) {
    throw new Error(data?.error || "Erro ao consultar /api/auth/me");
  }

  return data?.user; // { sub, email, role, name, ... }
}

// ✅ lista vendedores ativos (rota que você já testou e funciona)
export async function listBffSellers() {
  const token = getToken();

  const res = await fetch("/api/auth/sellers", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await asJson(res);

  if (!res.ok) {
    throw new Error(data?.error || "Erro ao listar vendedores");
  }

  const items = Array.isArray(data) ? data : data?.items;
  if (!Array.isArray(items)) return [];
  return items;
}

// ✅ cria vendedor (rota correta do teu BFF: POST /api/auth/users)
export async function adminCreateSeller({ name, email, password }) {
  const token = getToken();

  const res = await fetch("/api/auth/users", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      email,
      password,
      role: "seller",
    }),
  });

  const data = await asJson(res);

  if (!res.ok) {
    // ex: 403 admin, 409 email duplicado, 400 validação
    throw new Error(data?.error || `Falha ao criar usuário (${res.status})`);
  }

  return data?.user;
}