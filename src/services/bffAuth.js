// src/services/bffAuth.js

const TOKEN_KEY = "bff_token";
const USER_KEY = "bff_user";

/** =========================
 *  Storage helpers
 *  ========================= */
export function getToken() {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) throw new Error("Token ausente (faça login novamente).");
  return token;
}

export function getBffToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}

export function setBffToken(token) {
  if (!token) {
    localStorage.removeItem(TOKEN_KEY);
    return;
  }
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearBffAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function setBffUser(user) {
  if (!user) {
    localStorage.removeItem(USER_KEY);
    return;
  }
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getBffUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** =========================
 *  Unauthorized handler
 *  ========================= */
export function onBffUnauthorized() {
  clearBffAuth();

  // evento global (pra UI reagir com toast/modal, se quiser)
  window.dispatchEvent(new CustomEvent("bff:unauthorized"));

  // fallback simples
  if (window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
}

export function logout() {
  clearBffAuth();
  window.location.href = "/login";
}

/** =========================
 *  JSON reader (safe)
 *  ========================= */
async function readJsonSafe(res) {
  const ct = (res.headers.get("content-type") || "").toLowerCase();
  const text = await res.text();

  // Se por algum motivo veio HTML (index.html/erro), mostra claro:
  if (ct.includes("text/html") || text.trim().startsWith("<!DOCTYPE")) {
    const hint = `Servidor retornou HTML (${res.status}). Provável rota errada: ${res.url}`;
    const err = new Error(hint);
    err.status = res.status;
    err.raw = text.slice(0, 400);
    throw err;
  }

  try {
    return text ? JSON.parse(text) : {};
  } catch {
    const err = new Error(`Resposta inválida (não é JSON): ${text.slice(0, 200)}`);
    err.status = res.status;
    err.raw = text.slice(0, 400);
    throw err;
  }
}

/** =========================
 *  Central fetch wrapper
 *  ========================= */
export async function bffFetch(path, options = {}) {
  const token = getBffToken(); // aqui não dá throw; permite chamadas públicas se precisar
  const url = path.startsWith("/api") ? path : `/api${path}`;

  const headers = {
    ...(options.headers || {}),
  };

  if (token) headers.Authorization = `Bearer ${token}`;

  // se tiver body JSON, garante content-type
  if (options.body && !(options.body instanceof FormData)) {
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
  }

  let res;
  try {
    res = await fetch(url, { ...options, headers });
  } catch (e) {
    const err = new Error("Falha de rede ao chamar o BFF.");
    err.status = 0;
    err.cause = e;
    throw err;
  }

  // 204 No Content
  if (res.status === 204) return {};

  // tenta ler JSON ou joga erro claro
  const data = await readJsonSafe(res).catch((e) => {
    // se o backend devolveu HTML / JSON inválido, a gente preserva o erro
    e.status = e.status ?? res.status;
    throw e;
  });

  // ✅ definitivo: se token expirou/inválido, derruba sessão e força relogin
  if (res.status === 401) {
    onBffUnauthorized();
    const err = new Error(data?.error || data?.message || "Sessão expirada. Faça login novamente.");
    err.status = 401;
    err.data = data;
    throw err;
  }

  if (!res.ok) {
    const err = new Error(data?.error || data?.message || `Erro HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

/** =========================
 *  API functions
 *  ========================= */

// ✅ lista vendedores
export async function listBffSellers() {
  const data = await bffFetch("/auth/sellers", { method: "GET" });
  return Array.isArray(data?.items) ? data.items : [];
}

// ✅ admin cria usuário
export async function adminCreateUser({ name, email, password, role = "seller" }) {
  const data = await bffFetch("/auth/users", {
    method: "POST",
    body: JSON.stringify({ name, email, password, role }),
  });
  return data?.user;
}

// ✅ /me (e já atualiza o cache local do usuário)
export async function bffMe({ cache = true } = {}) {
  const data = await bffFetch("/auth/me", { method: "GET" });

  // Seu backend às vezes retorna { user }, às vezes retorna o user direto.
  const user = data?.user ?? data;

  if (cache) {
    setBffUser(user);
  }
  return user;
}

/**
 * ✅ helper para garantir que o Perfil sempre mostre o usuário certo:
 * - tenta usar cache primeiro (rápido)
 * - depois revalida em /me (garante que não está exibindo usuário anterior)
 */
export async function getCurrentUserFresh() {
  const cached = getBffUser();
  try {
    const fresh = await bffMe({ cache: true });
    return fresh || cached;
  } catch {
    // se falhar (inclui 401), o handler já redireciona
    return cached;
  }
}