// src/services/sellers.js
import { api } from "@/services/api";

export async function listSellers() {
  const { data } = await api.get("/api/auth/sellers");
  return Array.isArray(data?.items) ? data.items : [];
}

export async function adminCreateUser({ email, name, password, role = "seller" }) {
  const { data } = await api.post("/api/auth/users", { email, name, password, role });
  if (!data?.ok) {
    throw new Error(data?.error || "Falha ao criar usuário");
  }
  return data.user;
}

export async function adminUpdateUser(id, payload) {
  const { data } = await api.put(`/api/auth/users/${id}`, payload);
  if (!data?.ok) {
    throw new Error(data?.error || "Falha ao atualizar usuário");
  }
  return data.user;
}

export async function adminResetUserPassword(id, newPassword) {
  const { data } = await api.post(`/api/auth/users/${id}/reset-password`, { newPassword });
  if (!data?.ok) {
    throw new Error(data?.error || "Falha ao resetar senha");
  }
  return true;
}

export async function adminSetUserStatus(id, is_active) {
  const { data } = await api.patch(`/api/auth/users/${id}/status`, { is_active });
  if (!data?.ok) {
    throw new Error(data?.error || "Falha ao alterar status do usuário");
  }
  return true;
}

export async function adminDeleteUser(id) {
  const { data } = await api.delete(`/api/auth/users/${id}/hard`);
  if (!data?.ok) {
    throw new Error(data?.error || "Falha ao excluir usuário");
  }
  return true;
}