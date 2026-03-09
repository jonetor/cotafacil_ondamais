import React, { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import { motion } from "framer-motion";
import {
  History,
  RefreshCw,
  Search,
  UserCircle2,
  ShieldCheck,
  FileJson,
  CalendarClock,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

function getToken() {
  try {
    return localStorage.getItem("bff_token") || "";
  } catch {
    return "";
  }
}

async function apiFetch(path, options = {}) {
  const token = getToken();

  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const text = await res.text();
  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { ok: false, error: text || "Resposta inválida" };
  }

  if (!res.ok) {
    throw new Error(data?.error || data?.message || `Erro HTTP ${res.status}`);
  }

  return data;
}

function safeText(v) {
  return v === 0 ? "0" : v ? String(v) : "";
}

function formatDateTime(ts) {
  const n = Number(ts || 0);
  if (!n) return "-";

  const d = new Date(n);
  if (Number.isNaN(d.getTime())) return "-";

  return d.toLocaleString("pt-BR");
}

function prettyAction(action) {
  const map = {
    create: "Cadastro",
    update: "Edição",
    delete: "Exclusão",
    approve: "Aprovação",
    disable: "Desabilitação",
    enable: "Reativação",
    reset_password: "Reset de senha",
    change_password: "Troca de senha",
    update_profile: "Atualização de perfil",
    login: "Login",
    logout: "Logout",
  };

  return map[action] || safeText(action) || "-";
}

function prettyEntity(entity) {
  const map = {
    quote: "Cotação/Venda",
    product: "Produto",
    seller: "Vendedor",
    user: "Usuário",
    client: "Cliente",
    company: "Empresa",
    fiscal: "Fiscal",
  };

  return map[entity] || safeText(entity) || "-";
}

function DetailsBlock({ details }) {
  if (!details) return <span className="text-slate-500">-</span>;

  let parsed = details;

  if (typeof details === "string") {
    try {
      parsed = JSON.parse(details);
    } catch {
      parsed = details;
    }
  }

  if (typeof parsed === "string") {
    return <span className="text-slate-300">{parsed}</span>;
  }

  return (
    <pre className="text-xs text-slate-300 whitespace-pre-wrap break-words bg-slate-900/50 border border-white/5 rounded-lg p-3 overflow-x-auto">
      {JSON.stringify(parsed, null, 2)}
    </pre>
  );
}

export default function AuditLog() {
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");

  async function loadAudit() {
    try {
      setLoading(true);

      const r = await apiFetch("/api/audit", { method: "GET" });
      const list = Array.isArray(r?.items) ? r.items : [];

      setItems(list);
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar auditoria",
        description: e?.message || String(e),
      });
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAudit();
  }, []);

  const filteredItems = useMemo(() => {
    const q = safeText(search).toLowerCase().trim();
    if (!q) return items;

    return items.filter((log) => {
      const blob = [
        log?.user_name,
        log?.user_email,
        log?.action,
        log?.entity,
        log?.entity_id,
        typeof log?.details === "string" ? log.details : JSON.stringify(log?.details || {}),
      ]
        .join(" ")
        .toLowerCase();

      return blob.includes(q);
    });
  }, [items, search]);

  return (
    <div className="text-slate-200 min-h-full -m-8 p-8">
      <Helmet>
        <title>Auditoria | ONDA+</title>
      </Helmet>

      <div className="space-y-8">
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
                <History className="w-8 h-8 text-blue-300" />
                Auditoria
              </h1>
              <p className="text-slate-400 mt-1">
                Visualize as ações executadas pelos usuários no sistema.
              </p>
            </div>

            <Button className="btn-secondary" type="button" onClick={loadAudit} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          </div>
        </motion.div>

        <div className="floating-card p-4">
          <div className="relative w-full md:w-[420px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <Input
              placeholder="Buscar por usuário, ação, entidade ou detalhes..."
              className="pl-10 input-field"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="floating-card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Total de Logs</p>
                <h3 className="text-2xl font-bold text-slate-100 mt-1">{items.length}</h3>
              </div>
              <ShieldCheck className="w-8 h-8 text-blue-300" />
            </div>
          </div>

          <div className="floating-card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Logs Filtrados</p>
                <h3 className="text-2xl font-bold text-slate-100 mt-1">{filteredItems.length}</h3>
              </div>
              <Search className="w-8 h-8 text-cyan-300" />
            </div>
          </div>

          <div className="floating-card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Última Atualização</p>
                <h3 className="text-base font-semibold text-slate-100 mt-1">{formatDateTime(Date.now())}</h3>
              </div>
              <CalendarClock className="w-8 h-8 text-amber-300" />
            </div>
          </div>

          <div className="floating-card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Detalhes</p>
                <h3 className="text-base font-semibold text-slate-100 mt-1">JSON estruturado</h3>
              </div>
              <FileJson className="w-8 h-8 text-emerald-300" />
            </div>
          </div>
        </div>

        <div className="floating-card p-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-slate-400">
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-2">Data/Hora</th>
                <th className="text-left py-3 px-2">Usuário</th>
                <th className="text-left py-3 px-2">Ação</th>
                <th className="text-left py-3 px-2">Entidade</th>
                <th className="text-left py-3 px-2">Registro</th>
                <th className="text-left py-3 px-2">Detalhes</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-500">
                    Carregando logs...
                  </td>
                </tr>
              ) : filteredItems.length > 0 ? (
                filteredItems.map((log) => (
                  <tr key={log.id} className="border-b border-white/5 align-top hover:bg-white/5">
                    <td className="py-3 px-2 text-slate-300 whitespace-nowrap">
                      {formatDateTime(log.created_at)}
                    </td>

                    <td className="py-3 px-2">
                      <div className="flex flex-col">
                        <span className="text-slate-100 font-medium flex items-center gap-2">
                          <UserCircle2 className="w-4 h-4 text-slate-400" />
                          {safeText(log.user_name) || "-"}
                        </span>
                        <span className="text-slate-500 text-xs">{safeText(log.user_email) || "-"}</span>
                      </div>
                    </td>

                    <td className="py-3 px-2 text-slate-200">{prettyAction(log.action)}</td>
                    <td className="py-3 px-2 text-slate-200">{prettyEntity(log.entity)}</td>
                    <td className="py-3 px-2 text-slate-300">{safeText(log.entity_id) || "-"}</td>
                    <td className="py-3 px-2 min-w-[320px]">
                      <DetailsBlock details={log.details} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-500">
                    Nenhum log encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}