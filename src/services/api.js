// voalle_front/src/services/api.js
import axios from "axios";

// Se você usa proxy do Vite para /api -> BFF, pode deixar baseURL = "".
// Se NÃO usa proxy, coloque VITE_BFF_URL=http://localhost:3000 no .env do front.
const BASE_URL = import.meta.env.VITE_BFF_URL || "";

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
});

// ===== token helpers =====
function getToken() {
  return localStorage.getItem("bff_token") || "";
}

function setToken(token) {
  if (token) localStorage.setItem("bff_token", token);
}

function clearToken() {
  localStorage.removeItem("bff_token");
}

// ===== Request: injeta Authorization =====
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ===== Refresh control (evita 10 refresh ao mesmo tempo) =====
let isRefreshing = false;
let refreshPromise = null;

async function refreshToken() {
  const token = getToken();
  if (!token) throw new Error("Sem token para refresh");

  // importante: aqui NÃO usa o interceptor (senão loop)
  const res = await axios.post(
    `${BASE_URL}/api/auth/refresh`,
    null,
    { headers: { Authorization: `Bearer ${token}` }, timeout: 30000 }
  );

  const newToken = res?.data?.token;
  if (!newToken) throw new Error("Refresh não retornou token");

  setToken(newToken);
  return newToken;
}

// ===== Response: tenta refresh no 401 e repete a request =====
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const originalRequest = error?.config;

    // se não tem request original, só falha
    if (!originalRequest) return Promise.reject(error);

    // evita loop infinito
    if (originalRequest.__isRetryRequest) {
      return Promise.reject(error);
    }

    // só tenta refresh em 401
    if (status !== 401) {
      return Promise.reject(error);
    }

    // se não tiver token, já cai fora
    if (!getToken()) {
      return Promise.reject(error);
    }

    try {
      // controla concorrência
      if (!isRefreshing) {
        isRefreshing = true;
        refreshPromise = refreshToken().finally(() => {
          isRefreshing = false;
          refreshPromise = null;
        });
      }

      await refreshPromise;

      // marca retry e repete a request original
      originalRequest.__isRetryRequest = true;
      originalRequest.headers = originalRequest.headers || {};
      originalRequest.headers.Authorization = `Bearer ${getToken()}`;

      return api(originalRequest);
    } catch (e) {
      // refresh falhou -> limpa token e força login
      clearToken();

      // opcional: redireciona
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }

      return Promise.reject(error);
    }
  }
);