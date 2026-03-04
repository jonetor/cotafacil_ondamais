// voalle_front/src/services/sellers.js
import { api } from "@/services/api";

export async function listSellers() {
  const { data } = await api.get("/api/auth/sellers");
  // seu backend responde { ok:true, items:[...] }
  return Array.isArray(data?.items) ? data.items : [];
}

// ADMIN: cria usuário
export async function adminCreateUser({ email, name, password, role = "seller" }) {
  const { data } = await api.post("/api/auth/users", { email, name, password, role });

  if (!data?.ok) {
    throw new Error(data?.error || "Falha ao criar usuário");
  }

  return data.user;
}