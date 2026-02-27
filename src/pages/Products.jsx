import React, { useEffect, useState } from "react";
import { Plus, RefreshCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import ProductsList from "@/components/ProductsList";
import ProductCreateDialog from "@/components/products/ProductCreateDialog";
import { useAuth } from "@/contexts/SupabaseAuthContext"; // ✅

const LS_TOKEN_KEY = "token";

function getBffUrl() {
  return (import.meta.env.VITE_BFF_URL || "http://localhost:3000").replace(/\/$/, "");
}

async function bffFetch(path, opts = {}) {
  const base = getBffUrl();
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;

  const token = localStorage.getItem(LS_TOKEN_KEY);

  const headers = {
    Accept: "application/json",
    ...(opts.headers || {}),
  };

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

export default function Products() {
  const { user, loading: authLoading } = useAuth(); // ✅
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [openCreate, setOpenCreate] = useState(false);
  const { toast } = useToast();

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await bffFetch("/api/products?use=ALL&limit=20000", { method: "GET" });
      setItems(Array.isArray(data?.items) ? data.items : []);
    } catch (e) {
      setItems([]);
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  // ✅ só carrega depois que o auth terminar E tiver token
  useEffect(() => {
    if (authLoading) return;

    const token = localStorage.getItem(LS_TOKEN_KEY);

    // se não tem token, não chama BFF (evita "Token ausente")
    if (!token || !user) {
      setItems([]);
      setError("Sessão expirada. Faça login novamente.");
      return;
    }

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  async function handleSyncVoalle() {
    try {
      setLoading(true);
      await bffFetch("/api/products/sync-voalle", { method: "POST" });
      toast({ title: "Catálogo atualizado", description: "Itens da Voalle sincronizados com sucesso." });
      await load();
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar",
        description: String(e?.message || e),
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(payload) {
    try {
      await bffFetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      toast({ title: "Item criado", description: "Produto/serviço adicionado." });
      setOpenCreate(false);
      await load();
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Erro ao criar",
        description: String(e?.message || e),
      });
    }
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Produtos e Serviços</h1>
          <p className="text-slate-400">Itens do Voalle + itens manuais do CotaFácil.</p>
        </div>

        <div className="flex items-center gap-2 justify-end">
          <Button variant="secondary" onClick={handleSyncVoalle} disabled={loading || authLoading || !user}>
            <RefreshCcw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>

          <Button className="btn-primary" onClick={() => setOpenCreate(true)} disabled={authLoading || !user}>
            <Plus className="w-4 h-4 mr-2" />
            Adicionar
          </Button>
        </div>
      </div>

      {error ? <div className="text-red-400 mt-4">{error}</div> : null}

      <div className="mt-6">
        <ProductsList items={items} onRefresh={load} />
      </div>

      <ProductCreateDialog
        open={openCreate}
        onOpenChange={setOpenCreate}
        product={null}
        onSave={handleCreate}
      />
    </div>
  );
}