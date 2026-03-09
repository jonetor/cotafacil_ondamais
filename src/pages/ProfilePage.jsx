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

const TOKEN_KEY = "bff_token";
const USER_KEY = "bff_user";

function getTokenFromStorage() {
  try {
    return localStorage.getItem(TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

function setTokenToStorage(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {}
}

function setUserToStorage(user) {
  try {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  } catch {}
}

function clearAuthAndRedirect() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {}
  if (window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
}

export default function ProfilePage() {
  const { toast } = useToast();
  const { user: authUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [serverUser, setServerUser] = useState(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

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

  const api = useMemo(() => {
    const instance = axios.create();

    instance.interceptors.request.use((config) => {
      const t = getTokenFromStorage();
      if (t) {
        config.headers.Authorization = `Bearer ${t}`;
      }
      return config;
    });

    return instance;
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);

        const resp = await api.get("/api/auth/me");
        const data = resp?.data?.user || resp?.data || null;

        if (!data && resp?.status === 401) {
          clearAuthAndRedirect();
          return;
        }

        setServerUser(data);
        setUserToStorage(data);

        const n = safe(data?.name || authUser?.name || authUser?.user_metadata?.name);
        const e = safe(data?.email || authUser?.email);

        setName(n);
        setEmail(e);
      } catch (e) {
        const status = e?.response?.status;

        if (status === 401) {
          clearAuthAndRedirect();
          return;
        }

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
            "Verifique se o BFF está rodando e se o token (bff_token) está salvo no localStorage.",
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [api, authUser, toast]);

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

      if (resp?.data?.token) {
        setTokenToStorage(resp.data.token);
      }

      const updatedUser = resp?.data?.user || resp?.data || null;

      if (updatedUser) {
        setServerUser(updatedUser);
        setUserToStorage(updatedUser);
      }

      toast({ title: "Perfil atualizado!" });
    } catch (e1) {
      const status = e1?.response?.status;
      if (status === 401) {
        clearAuthAndRedirect();
        return;
      }

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
      toast({
        variant: "destructive",
        title: "Confirmação da senha não confere",
      });
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
      const status = e2?.response?.status;
      if (status === 401) {
        clearAuthAndRedirect();
        return;
      }

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

      <div className="space-y-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-sky-500/20 flex items-center justify-center">
              <UserCircle2 className="w-9 h-9 text-sky-300" />
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
          <div className="floating-card p-8 flex items-center gap-3 text-slate-300">
            <Loader2 className="w-5 h-5 animate-spin" />
            Carregando perfil...
          </div>
        ) : null}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="floating-card p-6 space-y-5"
          >
            <div className="flex items-center gap-2">
              <User2 className="w-5 h-5 text-slate-300" />
              <h2 className="text-xl font-semibold text-slate-100">Editar Perfil</h2>
            </div>

            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" className="input-field" />
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="input-field pl-10"
                />
              </div>
            </div>

            <p className="text-xs text-slate-500">
              Ao salvar, o BFF pode retornar um token novo. A página já atualiza isso automaticamente.
            </p>

            <Button className="btn-primary" onClick={handleSaveProfile} disabled={savingProfile}>
              <Save className="w-4 h-4 mr-2" />
              {savingProfile ? "Salvando..." : "Salvar Perfil"}
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className="floating-card p-6 space-y-5"
          >
            <div className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-slate-300" />
              <h2 className="text-xl font-semibold text-slate-100">Alterar Senha</h2>
            </div>

            <div className="space-y-2">
              <Label>Senha atual</Label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="input-field"
              />
            </div>

            <div className="space-y-2">
              <Label>Nova senha</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="input-field"
              />
            </div>

            <div className="space-y-2">
              <Label>Confirmar nova senha</Label>
              <Input
                type="password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                placeholder="••••••••"
                className="input-field"
              />
            </div>

            <Button className="btn-primary" onClick={handleChangePassword} disabled={savingPass}>
              <KeyRound className="w-4 h-4 mr-2" />
              {savingPass ? "Atualizando..." : "Atualizar senha"}
            </Button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}