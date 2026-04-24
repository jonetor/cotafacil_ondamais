import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { useAuth } from "@/contexts/SupabaseAuthContext";
import { useToast } from "@/components/ui/use-toast";

const DataContext = createContext(null);

export const useData = () => {
  const ctx = useContext(DataContext);
  if (ctx === null) throw new Error("useData must be used within a SupabaseDataProvider");
  return ctx;
};

const normalizeArray = (v) => (Array.isArray(v) ? v : []);

async function safeJson(res) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return { ok: false, error: text || "Resposta inválida" };
  }
}

function getApiBase() {
  const v = (import.meta.env.VITE_BFF_URL || "").trim();
  if (v) return v.replace(/\/$/, "");
  return "";
}

function getStoredToken() {
  try {
    return localStorage.getItem("bff_token") || localStorage.getItem("token") || "";
  } catch {
    return "";
  }
}

function sortClients(list) {
  return [...normalizeArray(list)].sort((a, b) => {
    const na = String(
      a?.name ||
        a?.nome ||
        a?.nome_razao ||
        a?.nome_fantasia ||
        a?.razao_social ||
        ""
    ).toLowerCase();

    const nb = String(
      b?.name ||
        b?.nome ||
        b?.nome_razao ||
        b?.nome_fantasia ||
        b?.razao_social ||
        ""
    ).toLowerCase();

    return na.localeCompare(nb, "pt-BR");
  });
}

function dedupeById(list) {
  const map = new Map();

  for (const item of normalizeArray(list)) {
    const id = String(item?.id ?? "");
    if (!id) continue;
    if (!map.has(id)) map.set(id, item);
  }

  return Array.from(map.values());
}

export function SupabaseDataProvider({ children }) {
  const { user, bffFetch } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);

  const [companies, setCompanies] = useState([]);
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [users, setUsers] = useState([]);

  const apiBase = getApiBase();

  const plainFetch = useCallback(
    async (path, opts = {}) => {
      const token = getStoredToken();

      const res = await fetch(`${apiBase}${path}`, {
        ...opts,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(opts.headers || {}),
        },
      });

      const data = await safeJson(res);

      if (!res.ok) {
        const msg = data?.error || data?.message || `Erro HTTP ${res.status}`;
        throw new Error(msg);
      }

      return data;
    },
    [apiBase]
  );

  const fetchSellers = useCallback(async () => {
    if (!user) return;
    try {
      const r = await bffFetch("/api/auth/sellers", { method: "GET" });
      setSellers(normalizeArray(r.items));
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Erro ao buscar vendedores",
        description: e?.message || String(e),
      });
    }
  }, [user, bffFetch, toast]);

  const fetchUsers = useCallback(async () => {
    if (!user) return;
    try {
      const r = await bffFetch("/api/auth/users", { method: "GET" });
      setUsers(normalizeArray(r.items));
    } catch (e) {
      console.warn("[fetchUsers]", e);
    }
  }, [user, bffFetch]);

  const fetchAllClientsPaged = useCallback(async () => {
    const pageSize = 200;
    let page = 1;
    let all = [];
    let safety = 0;

    while (true) {
      const query = `/api/voalle/clientes-db?page=${page}&limit=${pageSize}`;
      const r = await plainFetch(query, { method: "GET" });

      const batch = normalizeArray(r?.items ?? r?.data ?? r);
      if (batch.length === 0) break;

      all = all.concat(batch);

      if (batch.length < pageSize) break;

      page += 1;
      safety += 1;

      if (safety > 500) {
        console.warn("[fetchAllClientsPaged] limite de segurança atingido");
        break;
      }
    }

    return all;
  }, [plainFetch]);

      const fetchClients = useCallback(async () => {
      if (!user) return;

      try {
        const r = await plainFetch("/api/voalle/clientes-db?limit=50", { method: "GET" });
        const list = normalizeArray(r?.items ?? r);
        setClients(list);
      } catch (e) {
        toast({
          variant: "destructive",
          title: "Erro ao buscar clientes",
          description: e?.message || String(e),
        });
        setClients([]);
      }
    }, [user, plainFetch, toast]);

  const fetchQuotes = useCallback(async () => {
    if (!user) return;
    try {
      const r = await plainFetch("/api/quotes", { method: "GET" });
      if (r?.items) setQuotes(normalizeArray(r.items));
      else setQuotes(normalizeArray(r));
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Erro ao buscar cotações",
        description: e?.message || String(e),
      });
    }
  }, [user, plainFetch, toast]);

  const fetchProducts = useCallback(async () => {
    if (!user) return;
    try {
      const r = await bffFetch("/api/products", { method: "GET" });
      setProducts(normalizeArray(r.items || r.products || r));
    } catch (e) {
      console.warn("[fetchProducts]", e);
    }
  }, [user, bffFetch]);

  const reloadQuotes = useCallback(async () => {
    await fetchQuotes();
  }, [fetchQuotes]);

  const reloadClients = useCallback(async () => {
    await fetchClients();
  }, [fetchClients]);

  const addUser = useCallback(
    async (payload) => {
      const { name, email, password, role } = payload || {};
      const r = await bffFetch("/api/auth/users", {
        method: "POST",
        body: JSON.stringify({ name, email, password, role }),
      });
      await fetchUsers();
      await fetchSellers();
      return r;
    },
    [bffFetch, fetchUsers, fetchSellers]
  );

  const deleteUser = useCallback(
    async (id) => {
      const r = await bffFetch(`/api/auth/users/${id}`, { method: "DELETE" });
      await fetchUsers();
      await fetchSellers();
      return r;
    },
    [bffFetch, fetchUsers, fetchSellers]
  );

  const addQuote = useCallback(
    async (quote) => {
      const r = await plainFetch("/api/quotes", {
        method: "POST",
        body: JSON.stringify(quote || {}),
      });
      await fetchQuotes();
      return r;
    },
    [plainFetch, fetchQuotes]
  );

  const updateQuote = useCallback(
    async (id, quote) => {
      const r = await plainFetch(`/api/quotes/${id}`, {
        method: "PUT",
        body: JSON.stringify(quote || {}),
      });
      await fetchQuotes();
      return r;
    },
    [plainFetch, fetchQuotes]
  );

  const deleteQuote = useCallback(
    async (id) => {
      const r = await plainFetch(`/api/quotes/${id}`, { method: "DELETE" });
      await fetchQuotes();
      return r;
    },
    [plainFetch, fetchQuotes]
  );

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      setLoading(true);

      if (!user) {
        setLoading(false);
        return;
      }

      try {
        await Promise.all([
          fetchSellers(),
          fetchClients(),
          fetchQuotes(),
          fetchProducts(),
          fetchUsers(),
        ]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    boot();

    return () => {
      cancelled = true;
    };
  }, [user, fetchSellers, fetchClients, fetchQuotes, fetchProducts, fetchUsers]);

  const value = useMemo(
    () => ({
      loading,
      companies,
      clients,
      products,
      sellers,
      quotes,
      addresses,
      users,

      reloadQuotes,
      reloadClients,
      fetchQuotes,
      fetchClients,

      addUser,
      deleteUser,
      addQuote,
      updateQuote,
      deleteQuote,

      addClient: async () => {
        throw new Error("addClient não implementado no modo SQLite. Use sincronização Voalle.");
      },
      updateClient: async () => {
        throw new Error("updateClient não implementado no modo SQLite.");
      },
      deleteClient: async () => {
        throw new Error("deleteClient não implementado no modo SQLite.");
      },
    }),
    [
      loading,
      companies,
      clients,
      products,
      sellers,
      quotes,
      addresses,
      users,
      reloadQuotes,
      reloadClients,
      fetchQuotes,
      fetchClients,
      addUser,
      deleteUser,
      addQuote,
      updateQuote,
      deleteQuote,
    ]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export const DataProvider = SupabaseDataProvider;