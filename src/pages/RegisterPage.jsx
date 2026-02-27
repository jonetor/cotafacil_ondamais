import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { User, Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Link, useNavigate } from 'react-router-dom';

function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.endsWith('@ondamais.ai')) {
      toast({
        variant: "destructive",
        title: "Domínio de e-mail inválido",
        description: "O cadastro é permitido apenas para e-mails com domínio @ondamais.ai.",
      });
      return;
    }
    if (password.length < 6) {
        toast({
            variant: "destructive",
            title: "Senha muito curta",
            description: "A senha deve ter no mínimo 6 caracteres.",
        });
        return;
    }
    setLoading(true);
    const { error } = await signUp(email, password, { data: { name } });
    setLoading(false);
    if (!error) {
      toast({
        title: "Cadastro realizado com sucesso!",
        description: "Verifique seu e-mail para confirmar a sua conta.",
      });
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-app-background p-4 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-sm p-8 space-y-6 bg-sidebar rounded-2xl shadow-2xl shadow-black/30 border border-slate-800"
      >
        <div className="text-center space-y-4">
          <div className="inline-block">
            <h1 className="text-5xl font-bold text-slate-100 tracking-wider">ONDA<span className="text-blue-400">+</span></h1>
          </div>
          <h2 className="text-2xl font-bold text-blue-400">Crie sua Conta</h2>
          <p className="text-slate-400 text-sm">É rápido e fácil.</p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
            <Input
              id="name"
              type="text"
              placeholder="Nome Completo"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="pl-10 input-field h-12"
              disabled={loading}
            />
          </div>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
            <Input
              id="email"
              type="email"
              placeholder="seuemail@ondamais.ai"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="pl-10 input-field h-12"
              disabled={loading}
            />
          </div>
          <div className="relative">
             <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Senha (mín. 6 caracteres)"
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

          <Button type="submit" className="w-full btn-primary h-12 rounded-lg text-base" disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : ''}
            {loading ? 'Cadastrando...' : 'Cadastrar'}
          </Button>
        </form>
        
        <div className="text-center text-sm text-slate-400">
          <span>Já tem uma conta? </span>
          <Link to="/login" className="font-semibold text-blue-400 hover:text-blue-300">
            Faça login
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

export default RegisterPage;