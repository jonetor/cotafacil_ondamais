import React, { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import axios from "axios";
import { motion } from "framer-motion";
import { UserCircle2, Save, KeyRound, Mail, User2, Loader2 } from "lucide-react";

import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { useAuth } from "@/contexts/SupabaseAuthContext";

function safe(v) {
  return String(v ?? "").trim();
}

function getTokenFromStorage() {
  try {
    return localStorage.getItem("token") || "";
  } catch {
    return "";
  }
}

function setTokenToStorage(token) {
  try {
    if (token) localStorage.setItem("token", token);
  } catch {
    // ignore
  }
}

export default function ProfilePage() {
  const { toast } = useToast();
  const { user: authUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [serverUser, setServerUser] = useState(null);

  // Perfil
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  // Senha
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPass, setSavingPass] = useState(false);

  const displayUser = useMemo(() => serverUser || authUser || null, [serverUser, authUser]);

  const roleLabel = useMemo(() => {
    const r = safe(displayUser?.role || displayUser?.user_metadata?.role || "");
    if (!r) return "Vendedor";
    return r === "admin" ? "Administrador" : "Vendedor";
  }, [displayUser]);

  // axios com token (não depende de interceptor existir)
  const api = useMemo(() => {
    const instance = axios.create();
    instance.interceptors.request.use((config) => {
      const t = getTokenFromStorage();
      if (t) config.headers.Authorization = `Bearer ${t}`;
      return config;
    });
    return instance;
  }, []);

  // Carrega /api/auth/me (BFF)
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);

        const resp = await api.get("/api/auth/me");
        const data = resp?.data?.user || resp?.data || null;

        setServerUser(data);

        const n = safe(data?.name || data?.nome || authUser?.name || authUser?.user_metadata?.name);
        const e = safe(data?.email || authUser?.email);

        setName(n);
        setEmail(e);
      } catch (e) {
        // fallback: auth local, sem quebrar
        console.warn("[ProfilePage] erro ao carregar /api/auth/me:", e?.response?.data || e?.message || e);

        const n = safe(authUser?.name || authUser?.user_metadata?.name || authUser?.email);
        const em = safe(authUser?.email);

        setName(n);
        setEmail(em);

        toast({
          variant: "destructive",
          title: "Não consegui carregar o perfil pelo servidor",
          description:
            e?.response?.data?.error ||
            e?.message ||
            "Verifique se o BFF está rodando e se o token está salvo no localStorage.",
        });
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveProfile = async () => {
    const n = safe(name);
    const e = safe(email).toLowerCase();

    if (!n) {
      toast({ variant: "destructive", title: "Informe seu nome" });
      return;
    }
    if (!e || !e.includes("@")) {
      toast({ variant: "destructive", title: "Informe um email válido" });
      return;
    }

    try {
      setSavingProfile(true);

      const resp = await api.put("/api/auth/me", { name: n, email: e });

      // ✅ se o BFF retornar token novo, salva pra refletir nome/email atualizados
      if (resp?.data?.token) {
        setTokenToStorage(resp.data.token);
      }

      const updated = resp?.data?.user || resp?.data?.user || resp?.data || null;
      if (updated?.user) {
        // caso venha { ok, user, token }
        setServerUser(updated.user);
      } else {
        setServerUser(updated);
      }

      toast({ title: "Perfil atualizado!" });
    } catch (e1) {
      console.error(e1);
      toast({
        variant: "destructive",
        title: "Erro ao salvar perfil",
        description: e1?.response?.data?.error || e1?.message || "Falha ao salvar no BFF.",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!safe(currentPassword)) {
      toast({ variant: "destructive", title: "Informe a senha atual" });
      return;
    }
    if (safe(newPassword).length < 6) {
      toast({
        variant: "destructive",
        title: "Nova senha muito curta",
        description: "Mínimo 6 caracteres.",
      });
      return;
    }
    if (safe(newPassword) !== safe(confirmNewPassword)) {
      toast({ variant: "destructive", title: "Confirmação da senha não confere" });
      return;
    }

    try {
      setSavingPass(true);

      await api.post("/api/auth/change-password", {
        currentPassword: safe(currentPassword),
        newPassword: safe(newPassword),
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");

      toast({ title: "Senha atualizada!" });
    } catch (e2) {
      console.error(e2);
      toast({
        variant: "destructive",
        title: "Erro ao alterar senha",
        description: e2?.response?.data?.error || e2?.message || "Falha ao atualizar senha no BFF.",
      });
    } finally {
      setSavingPass(false);
    }
  };

  const shownName = safe(displayUser?.name || displayUser?.user_metadata?.name || displayUser?.email || "Usuário");
  const shownEmail = safe(displayUser?.email || "");

  return (
    <div className="text-slate-200 min-h-full -m-8 p-8">
      <Helmet>
        <title>Meu Perfil | ONDA+</title>
      </Helmet>

      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-start gap-3">
            <div className="h-12 w-12 rounded-2xl border border-white/10 bg-white/5 flex items-center justify-center">
              <UserCircle2 className="w-6 h-6 text-white/70" />
            </div>

            <div>
              <h1 className="text-3xl font-bold text-slate-100">Meu Perfil</h1>
              <p className="text-slate-400 mt-1">
                {shownName}
                {shownEmail ? ` • ${shownEmail}` : ""} • {roleLabel}
              </p>
            </div>
          </div>
        </motion.div>

        {loading ? (
          <div className="floating-card p-6 text-slate-400 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Carregando perfil...
          </div>
        ) : null}

        {/* PERFIL */}
        <div className="floating-card p-6 space-y-4">
          <div className="text-slate-100 font-semibold">Editar Perfil</div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label>Nome</Label>
              <div className="relative">
                <User2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <Input
                  className="input-field pl-10"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <Input
                  className="input-field pl-10"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                />
              </div>
              <div className="text-xs text-slate-500">
                * Ao salvar, o BFF pode retornar um token novo (a página já salva automaticamente).
              </div>
            </div>

            <div className="md:col-span-2 flex justify-end">
              <Button className="btn-primary" onClick={handleSaveProfile} disabled={savingProfile}>
                <Save className="w-4 h-4 mr-2" />
                {savingProfile ? "Salvando..." : "Salvar Perfil"}
              </Button>
            </div>
          </div>
        </div>

        {/* SENHA */}
        <div className="floating-card p-6 space-y-4">
          <div className="text-slate-100 font-semibold">Alterar Senha</div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="space-y-2">
              <Label>Senha atual</Label>
              <Input
                className="input-field"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <div className="space-y-2">
              <Label>Nova senha</Label>
              <Input
                className="input-field"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <div className="space-y-2">
              <Label>Confirmar nova senha</Label>
              <Input
                className="input-field"
                type="password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <div className="md:col-span-3 flex justify-end">
              <Button
                variant="secondary"
                className="btn-secondary"
                onClick={handleChangePassword}
                disabled={savingPass}
              >
                <KeyRound className="w-4 h-4 mr-2" />
                {savingPass ? "Atualizando..." : "Atualizar senha"}
              </Button>
            </div>
          </div>

          <div className="text-xs text-slate-500">
            Se der 401, confirme se o token está no localStorage e se o BFF está validando Bearer token.
          </div>
        </div>
      </div>
    </div>
  );
}