import axios from "axios";

function getToken() {
  return localStorage.getItem("auth_token"); // ajuste se você salva com outro nome
}

export async function listAuthUsers() {
  const token = getToken();
  const resp = await axios.get("/api/auth/users", {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  // espero algo como: { items: [...] } ou direto [...]
  const data = resp.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}