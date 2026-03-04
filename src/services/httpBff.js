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
 * Wrapper global do BFF
 */
export async function bffFetch(path, options = {}) {
  const token = getBffToken();

  const headers = {
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (options.body && !(options.body instanceof FormData)) {
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
  }

  const response = await fetch(path.startsWith("/api") ? path : `/api${path}`, {
    ...options,
    headers,
  });

  // 🔴 Se token expirou
  if (response.status === 401) {
    clearBffAuth();

    // evita loop infinito
    if (!window.location.pathname.includes("/login")) {
      alert("Sua sessão expirou. Faça login novamente.");
      window.location.href = "/login";
    }

    throw new Error("Sessão expirada");
  }

  const text = await response.text();
  let data = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    const msg = data?.error || data?.message || `HTTP ${response.status}`;
    throw new Error(msg);
  }

  return data;
}