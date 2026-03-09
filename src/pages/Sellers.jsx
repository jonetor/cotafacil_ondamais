import React, { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import { motion } from "framer-motion";
import {
  UserCircle,
  Plus,
  Search,
  Pencil,
  KeyRound,
  Power,
  Trash2,
} from "lucide-react";
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
import {
  listSellers,
  adminCreateUser,
  adminUpdateUser,
  adminResetUserPassword,
  adminSetUserStatus,
  adminDeleteUser,
} from "@/services/sellers";

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
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="text-sm text-slate-300">Nome</label>
        <Input value={name} onChange={(e) => setName(e.target.value)} required />
      </div>

      <div>
        <label className="text-sm text-slate-300">Email</label>
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>

      <div>
        <label className="text-sm text-slate-300">Senha</label>
        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </div>

      <div className="flex justify-end">
        <Button type="submit" className="btn-primary" disabled={saving}>
          {saving ? "Criando..." : "Criar vendedor"}
        </Button>
      </div>
    </form>
  );
}

function EditSellerForm({ seller, onSaved }) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(seller?.name || "");
  const [email, setEmail] = useState(seller?.email || "");

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await adminUpdateUser(seller.id, {
        name,
        email,
        role: "seller",
      });

      toast({
        title: "Vendedor atualizado!",
        description: "Os dados do vendedor foram salvos.",
      });

      onSaved?.();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Erro ao editar vendedor",
        description: String(err?.message || err),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="text-sm text-slate-300">Nome</label>
        <Input value={name} onChange={(e) => setName(e.target.value)} required />
      </div>

      <div>
        <label className="text-sm text-slate-300">Email</label>
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>

      <div className="flex justify-end">
        <Button type="submit" className="btn-primary" disabled={saving}>
          {saving ? "Salvando..." : "Salvar alterações"}
        </Button>
      </div>
    </form>
  );
}

function ResetPasswordForm({ seller, onSaved }) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [password, setPassword] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await adminResetUserPassword(seller.id, password);

      toast({
        title: "Senha resetada!",
        description: `A nova senha de ${seller?.name || "Usuário"} foi definida.`,
      });

      setPassword("");
      onSaved?.();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Erro ao resetar senha",
        description: String(err?.message || err),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="text-sm text-slate-300">Nova senha</label>
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>

      <div className="flex justify-end">
        <Button type="submit" className="btn-primary" disabled={saving}>
          {saving ? "Resetando..." : "Resetar senha"}
        </Button>
      </div>
    </form>
  );
}

export default function Sellers() {
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [openReset, setOpenReset] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedSeller, setSelectedSeller] = useState(null);

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

  const handleToggleStatus = async (seller) => {
    try {
      await adminSetUserStatus(seller.id, !seller.is_active);
      toast({
        title: seller.is_active ? "Vendedor desabilitado" : "Vendedor reativado",
        description: `${seller.name} foi atualizado com sucesso.`,
      });
      await load();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Erro ao alterar status",
        description: String(err?.message || err),
      });
    }
  };

  const handleDelete = async (seller) => {
    const ok = window.confirm(`Deseja excluir permanentemente o vendedor "${seller.name}"?`);
    if (!ok) return;

    try {
      await adminDeleteUser(seller.id);
      toast({
        title: "Vendedor excluído",
        description: `${seller.name} foi removido permanentemente.`,
      });
      await load();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Erro ao excluir vendedor",
        description: String(err?.message || err),
      });
    }
  };

  if (!isAdmin) {
    return (
      <div className="text-slate-200 min-h-full -m-8 p-8">
        <Helmet>
          <title>Vendedores | ONDA+</title>
        </Helmet>

        <div className="floating-card p-8">
          <h1 className="text-2xl font-bold text-white mb-2">Acesso restrito</h1>
          <p className="text-slate-400">Somente o usuário admin pode acessar esta página.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="text-slate-200 min-h-full -m-8 p-8">
      <Helmet>
        <title>Vendedores | ONDA+</title>
      </Helmet>

      <div className="space-y-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-100">Vendedores</h1>
              <p className="text-slate-400 mt-1">Administração de vendedores (BFF).</p>
            </div>

            <Dialog open={openCreate} onOpenChange={setOpenCreate}>
              <DialogTrigger asChild>
                <Button className="btn-primary">
                  <Plus className="w-4 h-4 mr-2" />
                  Novo vendedor
                </Button>
              </DialogTrigger>
              <DialogContent className="glass-effect border-white/20 text-white">
                <DialogHeader>
                  <DialogTitle>Criar vendedor</DialogTitle>
                </DialogHeader>
                <NewSellerForm
                  onCreated={() => {
                    setOpenCreate(false);
                    load();
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>
        </motion.div>

        <div className="relative w-full md:w-1/3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <Input
            placeholder="Buscar por nome ou email..."
            className="pl-10 w-full input-field"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="floating-card p-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-slate-400">
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-2">Nome</th>
                <th className="text-left py-3 px-2">E-mail</th>
                <th className="text-left py-3 px-2">Status</th>
                <th className="text-right py-3 px-2">Ações</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-slate-500">
                    Carregando...
                  </td>
                </tr>
              ) : filtered.length > 0 ? (
                filtered.map((s) => (
                  <tr key={s.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="py-3 px-2 text-slate-100 font-medium">{s.name}</td>
                    <td className="py-3 px-2 text-slate-300">{s.email}</td>
                    <td className="py-3 px-2">
                      <span
                        className={`px-2 py-1 rounded-md text-xs ${
                          s.is_active ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"
                        }`}
                      >
                        {s.is_active ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          className="btn-secondary"
                          title="Editar vendedor"
                          onClick={() => {
                            setSelectedSeller(s);
                            setOpenEdit(true);
                          }}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>

                        <Button
                          type="button"
                          variant="secondary"
                          className="btn-secondary"
                          title="Resetar senha"
                          onClick={() => {
                            setSelectedSeller(s);
                            setOpenReset(true);
                          }}
                        >
                          <KeyRound className="w-4 h-4" />
                        </Button>

                        <Button
                          type="button"
                          variant="secondary"
                          className="btn-secondary"
                          title={s.is_active ? "Desabilitar vendedor" : "Reativar vendedor"}
                          onClick={() => handleToggleStatus(s)}
                        >
                          <Power className={`w-4 h-4 ${s.is_active ? "text-yellow-300" : "text-green-300"}`} />
                        </Button>

                        <Button
                          type="button"
                          variant="secondary"
                          className="btn-secondary"
                          title="Excluir vendedor"
                          onClick={() => handleDelete(s)}
                        >
                          <Trash2 className="w-4 h-4 text-red-300" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-slate-500">
                    Nenhum vendedor encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={openEdit} onOpenChange={setOpenEdit}>
        <DialogContent className="glass-effect border-white/20 text-white">
          <DialogHeader>
            <DialogTitle>Editar vendedor</DialogTitle>
          </DialogHeader>
          {selectedSeller ? (
            <EditSellerForm
              seller={selectedSeller}
              onSaved={() => {
                setOpenEdit(false);
                setSelectedSeller(null);
                load();
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={openReset} onOpenChange={setOpenReset}>
        <DialogContent className="glass-effect border-white/20 text-white">
          <DialogHeader>
            <DialogTitle>Resetar senha</DialogTitle>
          </DialogHeader>
          {selectedSeller ? (
            <ResetPasswordForm
              seller={selectedSeller}
              onSaved={() => {
                setOpenReset(false);
                setSelectedSeller(null);
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}