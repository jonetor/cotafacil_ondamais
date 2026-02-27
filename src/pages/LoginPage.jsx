import React, { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, Lock, Eye, EyeOff, Loader2, Info } from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/SupabaseAuthContext";

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { signIn } = useAuth();
  const { toast } = useToast();

  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await signIn(email, password);

    setLoading(false);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro no login",
        description: String(error?.message || error),
      });
      return;
    }

    toast({
      title: "Login bem-sucedido!",
      description: "Bem-vindo de volta!",
    });

    // ✅ volta para rota original (se veio de rota protegida)
    const from = location.state?.from?.pathname;
    if (from) {
      navigate(from, { replace: true });
      return;
    }

    // ✅ rota padrão
    navigate("/dashboard", { replace: true });
  };

  const fillAdmin = () => {
    setEmail("admin@ondamais.ai");
    setPassword("102030");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-app-background p-4 font-sans">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-sm"
      >
        <div className="p-8 space-y-6 bg-sidebar rounded-2xl shadow-2xl shadow-black/30 border border-slate-800">
          <div className="text-center space-y-2">
            <div className="inline-block">
              <h1 className="text-5xl font-bold text-slate-100 tracking-wider">
                ONDA<span className="text-blue-400">+</span>
              </h1>
            </div>
            <h2 className="text-2xl font-bold text-blue-400">CotaFacil</h2>
            <p className="text-slate-400 text-sm">Sistema de Cotações Comerciais</p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
              <Input
                id="email"
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="pl-10 input-field h-12"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pl-10 pr-10 input-field h-12"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>

              <div className="text-right">
                <Link
                  to="/forgot-password"
                  className="text-xs font-semibold text-blue-400 hover:text-blue-300 hover:underline"
                >
                  Esqueci minha senha
                </Link>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full btn-primary h-12 rounded-lg text-base"
              disabled={loading}
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : ""}
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </form>

          <div className="text-center text-sm text-slate-400">
            <span>Não tem uma conta? </span>
            <Link to="/register" className="font-semibold text-blue-400 hover:text-blue-300">
              Cadastre-se aqui
            </Link>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-6 bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 text-xs text-slate-400 cursor-pointer"
          onClick={fillAdmin}
        >
          <div className="flex items-start gap-3">
            <Info className="w-4 h-4 mt-0.5 text-blue-400 flex-shrink-0" />
            <div>
              <p className="font-bold text-slate-300 mb-1">Acesso Rápido (Admin)</p>
              <p><strong>Email:</strong> admin@ondamais.ai</p>
              <p><strong>Senha:</strong> 102030</p>
              <p className="mt-2 text-slate-500">Clique aqui para preencher automaticamente.</p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

export default LoginPage;