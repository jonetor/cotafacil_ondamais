function getToken() {
  const token = localStorage.getItem("bff_token");
  if (!token) throw new Error("Token ausente (faça login novamente).");
  return token;
}

async function readJsonSafe(res) {
  const ct = (res.headers.get("content-type") || "").toLowerCase();
  const text = await res.text();

  // Se por algum motivo veio HTML (index.html/erro), mostra claro:
  if (ct.includes("text/html") || text.trim().startsWith("<!DOCTYPE")) {
    throw new Error(`Servidor retornou HTML (${res.status}). Provável rota errada: ${res.url}`);
  }

  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Resposta inválida (não é JSON): ${text.slice(0, 200)}`);
  }
}

export async function listBffSellers() {
  const token = getToken();
  const res = await fetch("/api/auth/sellers", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await readJsonSafe(res);
  if (!res.ok) throw new Error(data?.error || "Erro ao listar vendedores");
  return Array.isArray(data?.items) ? data.items : [];
}

export async function adminCreateUser({ name, email, password, role = "seller" }) {
  const token = getToken();
  const res = await fetch("/api/auth/users", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name, email, password, role }),
  });
  const data = await readJsonSafe(res);
  if (!res.ok) throw new Error(data?.error || `Falha ao criar usuário (${res.status})`);
  return data?.user;
}

export async function bffMe() {
  const token = getToken();
  const res = await fetch("/api/auth/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await readJsonSafe(res);
  if (!res.ok) throw new Error(data?.error || "Erro ao consultar /me");
  return data?.user;
}