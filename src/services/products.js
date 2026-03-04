// src/services/products.js
import { api } from "@/services/api";

// GET /api/products
export async function listProducts(params = {}) {
  const { data } = await api.get("/api/products", { params });
  return Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
}

// POST /api/products
export async function createProduct(payload) {
  const { data } = await api.post("/api/products", payload);
  return data;
}

// PUT /api/products/:id
export async function updateProduct(id, payload) {
  const { data } = await api.put(`/api/products/${id}`, payload);
  return data;
}

// DELETE /api/products/:id
export async function deleteProduct(id) {
  const { data } = await api.delete(`/api/products/${id}`);
  return data;
}

// POST /api/products/sync-voalle
export async function syncVoalleProducts() {
  const { data } = await api.post("/api/products/sync-voalle");
  return data;
}