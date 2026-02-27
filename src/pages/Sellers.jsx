// voalle_front/src/pages/Sellers.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import { motion, AnimatePresence } from "framer-motion";
import { UserCircle, Plus, Search } from "lucide-react";

import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { listSellers, adminCreateUser } from "@/services/sellers";

// ✅ seu /api/auth/me retorna role dentro do token (admin/seller)
// aqui a gente lê o token e usa o payload do /me?
// melhor: chamar /api/auth/me (mas para simplicidade, usamos o token armazenado e o serviço /api/auth/me no Layout/Context)
function getRoleFromJwt() {
  try {
    const token = localStorage.getItem("bff_token");
    if (!token) return null;
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload?.role || null;
  } catch {
    return null;
  }
}

function NewSellerForm({ onCreated }) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const user = await adminCreateUser({
        name,
        email,
        password,
        role: "seller",
      });

      toast({
        title: "Vendedor criado!",
        description: `${user?.name || "Usuário"} criado com sucesso.`,
      });

      setName("");
      setEmail("");
      setPassword("");

      onCreated?.();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Erro ao criar vendedor",
        description: String(err?.message || err),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label className="text-sm text-slate-300">Nome</label>
        <Input className="input-field" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>

      <div>
        <label className="text-sm text-slate-300">Email</label>
        <Input className="input-field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>

      <div>
        <label className="text-sm text-slate-300">Senha</label>
        <Input className="input-field" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </div>

      <Button type="submit" className="btn-primary w-full" disabled={saving}>
        {saving ? "Criando..." : "Criar vendedor"}
      </Button>
    </form>
  );
}

export default function Sellers() {
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const role = getRoleFromJwt();
  const isAdmin = role === "admin";

  async function load() {
    setLoading(true);
    try {
      const list = await listSellers();
      setItems(Array.isArray(list) ? list : []);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar vendedores",
        description: String(err?.message || err),
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isAdmin) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;

    return items.filter((s) => {
      const a = (s?.name || "").toLowerCase();
      const b = (s?.email || "").toLowerCase();
      return a.includes(q) || b.includes(q);
    });
  }, [items, search]);

  if (!isAdmin) {
    return (
      <div className="text-slate-200 min-h-full -m-8 p-8">
        <Helmet><title>Vendedores | ONDA+</title></Helmet>
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-6">
          <h1 className="text-2xl font-bold text-slate-100">Acesso restrito</h1>
          <p className="text-slate-400 mt-2">
            Somente o usuário <b>admin</b> pode acessar esta página.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="text-slate-200 min-h-full -m-8 p-8">
      <Helmet><title>Vendedores | ONDA+</title></Helmet>

      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-100">Vendedores</h1>
              <p className="text-slate-400 mt-1">Administração de vendedores (BFF).</p>
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="btn-primary">
                  <Plus className="w-4 h-4 mr-2" />
                  Novo vendedor
                </Button>
              </DialogTrigger>
              <DialogContent className="glass-effect border-slate-700 text-slate-200">
                <DialogHeader>
                  <DialogTitle className="text-slate-100">Criar vendedor</DialogTitle>
                </DialogHeader>
                <NewSellerForm
                  onCreated={() => {
                    setOpen(false);
                    load();
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>
        </motion.div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <Input
            placeholder="Buscar por nome ou email..."
            className="pl-10 w-full md:w-1/3 input-field"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="min-w-full text-sm text-slate-200">
            <thead className="bg-slate-800/60 text-slate-400">
              <tr>
                <th className="p-3 text-left font-semibold">Nome</th>
                <th className="p-3 text-left font-semibold">E-mail</th>
                <th className="p-3 text-center font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {loading ? (
                  <tr className="border-t border-slate-800">
                    <td className="p-4 text-slate-400" colSpan={3}>Carregando...</td>
                  </tr>
                ) : (
                  filtered.map((s) => (
                    <motion.tr
                      key={s.id}
                      className="border-t border-slate-800 hover:bg-slate-800/40 transition-colors"
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <td className="p-3 font-medium text-slate-100">{s.name}</td>
                      <td className="p-3">{s.email}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          s.is_active ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300"
                        }`}>
                          {s.is_active ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                    </motion.tr>
                  ))
                )}
              </AnimatePresence>
            </tbody>
          </table>

          {!loading && filtered.length === 0 && (
            <div className="text-center py-16 text-slate-500">
              <UserCircle className="w-16 h-16 mx-auto mb-4" />
              <h3 className="text-xl font-semibold">Nenhum vendedor encontrado</h3>
              <p>Tente ajustar sua busca ou crie um novo vendedor.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}