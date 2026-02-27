import React, { useEffect, useMemo, useState } from "react";
import { Loader2, Search, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const LS_TOKEN_KEY = "token";

function getBffUrl() {
  return (import.meta.env.VITE_BFF_URL || "http://localhost:3000").replace(/\/$/, "");
}

async function bffGet(path) {
  const base = getBffUrl();
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  const token = localStorage.getItem(LS_TOKEN_KEY);

  const headers = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, { method: "GET", headers });
  const text = await res.text();

  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (!res.ok) {
    const msg = (json && (json.message || json.error)) || text || `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return json;
}

function displayName(c) {
  return (
    String(c?.nome_fantasia || "").trim() ||
    String(c?.nome_razao || "").trim() ||
    "(sem nome)"
  );
}

export default function ClientSelector({ onSelect, onCreateNewClient }) {
  const [q, setQ] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    const t = setTimeout(async () => {
      try {
        setLoading(true);
        setError("");

        const qs = new URLSearchParams();
        qs.set("limit", "80");
        if (String(q || "").trim()) qs.set("q", String(q).trim());

        const data = await bffGet(`/api/voalle/clientes-db?${qs.toString()}`);
        const arr = Array.isArray(data?.items) ? data.items : [];
        if (alive) setItems(arr);
      } catch (e) {
        if (alive) {
          setItems([]);
          setError(String(e?.message || e));
        }
      } finally {
        if (alive) setLoading(false);
      }
    }, 250);

    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [q]);

  const list = useMemo(() => (Array.isArray(items) ? items : []), [items]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nome ou CPF/CNPJ..."
            className="pl-9 input-field"
          />
        </div>

        {onCreateNewClient ? (
          <Button type="button" variant="outline" onClick={onCreateNewClient}>
            <UserPlus className="w-4 h-4 mr-2" /> Novo
          </Button>
        ) : null}
      </div>

      {error ? <div className="text-sm text-red-400">{error}</div> : null}

      <div className="max-h-[50vh] overflow-y-auto space-y-2 pr-2">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-white/70 p-3">
            <Loader2 className="w-4 h-4 animate-spin" /> Carregando clientes...
          </div>
        ) : null}

        {list.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelect?.(c)}
            className="w-full text-left p-3 bg-slate-800/50 rounded-lg hover:bg-slate-700/50 transition-all"
          >
            <div className="font-semibold text-slate-100">{displayName(c)}</div>
            <div className="text-xs text-slate-400 mt-1">
              {c?.cpf_cnpj ? `CPF/CNPJ: ${c.cpf_cnpj}` : ""}
              {c?.telefone ? ` • Tel: ${c.telefone}` : ""}
              {c?.email ? ` • Email: ${c.email}` : ""}
            </div>
          </button>
        ))}

        {!loading && list.length === 0 ? (
          <div className="text-sm text-white/60 p-3">Nenhum cliente encontrado.</div>
        ) : null}
      </div>
    </div>
  );
}
