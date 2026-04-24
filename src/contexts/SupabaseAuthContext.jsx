import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const AuthContext = createContext(null);

const LS_TOKEN_KEY = "bff_token";

function getBffUrl() {
  return (import.meta.env.VITE_BFF_URL || window.location.origin).replace(/\/$/, "");
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

  const token = opts.token ?? getToken();
  const headers = {
    Accept: "application/json",
    ...(opts.headers || {}),
  };

  const hasBody = opts.body !== undefined && opts.body !== null;
  if (hasBody && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, { ...opts, headers });

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { ok: false, error: text || "Resposta inválida do servidor" };
  }

  if (!res.ok) {
    throw new Error(data?.error || data?.message || `HTTP ${res.status}`);
  }

  return data;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      setLoading(true);
      const t = getToken();

      if (!t) {
        if (!cancelled) {
          setUser(null);
          setLoading(false);
        }
        return;
      }

      try {
        const me = await bffFetch("/api/auth/me", { method: "GET", token: t });
        if (!cancelled) setUser(me?.user || null);
      } catch {
        clearToken();
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    boot();
    return () => {
      cancelled = true;
    };
  }, []);

  async function signIn(arg1, arg2) {
    const email = typeof arg1 === "object" ? arg1.email : arg1;
    const password = typeof arg1 === "object" ? arg1.password : arg2;

    const data = await bffFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
      token: "",
    });

    if (!data?.token) throw new Error("Login retornou sem token");
    setToken(data.token);
    setUser(data.user || null);
    return data.user;
  }

  async function signUp({ name, email, password }) {
    const data = await bffFetch("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
      token: "",
    });

    if (!data?.token) throw new Error("Cadastro retornou sem token");
    setToken(data.token);
    setUser(data.user || null);
    return data.user;
  }

  function signOut() {
    clearToken();
    setUser(null);
  }

  const value = useMemo(
    () => ({
      user,
      loading,
      signIn,
      signUp,
      signOut,
      bffFetch,
      bffUrl: getBffUrl(),
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de <AuthProvider />");
  return ctx;
}

export const SupabaseAuthProvider = AuthProvider;