// src/contexts/SupabaseAuthContext.jsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const AuthContext = createContext(null);

// ✅ chave ÚNICA (o resto do projeto já usa "token")
const LS_TOKEN_KEY = "token";

function getBffUrl() {
  // VITE_BFF_URL=http://localhost:3000
  return (import.meta.env.VITE_BFF_URL || "http://localhost:3000").replace(/\/$/, "");
}

function getToken() {
  return localStorage.getItem(LS_TOKEN_KEY) || "";
}
function setToken(t) {
  if (t) localStorage.setItem(LS_TOKEN_KEY, t);
}
function clearToken() {
  localStorage.removeItem(LS_TOKEN_KEY);
}

async function bffFetch(path, opts = {}) {
  const base = getBffUrl();
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;

  const token = getToken();

  const headers = {
    Accept: "application/json",
    ...(opts.headers || {}),
  };

  // ✅ só adiciona Authorization se tiver token
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, { ...opts, headers });
  const text = await res.text();

  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (!res.ok) {
    const msg = (json && (json.message || json.error)) || text || `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.payload = json;
    throw err;
  }

  return json;
}

async function bffLogin(email, password) {
  const data = await bffFetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: String(email || "").trim(),
      password: String(password || ""),
    }),
  });

  // seu BFF devolve { ok:true, token:"..." }
  if (!data?.ok || !data?.token) {
    throw new Error(data?.error || data?.message || "Falha no login");
  }
  return data.token;
}

async function bffMe(token) {
  // chama /me usando token explícito (não depende do localStorage)
  const base = getBffUrl();
  const url = `${base}/api/auth/me`;

  const r = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const text = await r.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!r.ok || !data?.ok || !data?.user) {
    throw new Error((data && (data.error || data.message)) || text || "Token inválido/expirado");
  }

  return data.user; // { sub, email, role, name, iat, exp }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // payload do /me
  const [loading, setLoading] = useState(true);

  // ✅ ao carregar app, valida token (se existir)
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const token = getToken();
        if (!token) {
          if (alive) setUser(null);
          return;
        }

        const me = await bffMe(token);
        if (alive) setUser(me);
      } catch {
        // token ruim → limpa e força login
        clearToken();
        if (alive) setUser(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  // ✅ login
  const signIn = async (email, password) => {
    try {
      const token = await bffLogin(email, password);
      setToken(token);

      const me = await bffMe(token);
      setUser(me);

      return { error: null, user: me };
    } catch (e) {
      return { error: e, user: null };
    }
  };

  // ✅ logout
  const signOut = async () => {
    clearToken();
    setUser(null);
    return { error: null };
  };

  const value = useMemo(
    () => ({
      user,
      loading,
      signIn,
      signOut,

      // helpers
      token: getToken(),
      isAdmin: user?.role === "admin",
      isSeller: user?.role === "seller",
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}