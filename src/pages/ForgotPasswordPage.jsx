import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail, Loader2, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';

function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    // This is a placeholder for the actual "forgot password" logic
    setTimeout(() => {
        setLoading(false);
        toast({
            title: "🚧 Funcionalidade em desenvolvimento",
            description: "A recuperação de senha ainda não foi implementada. Você pode solicitar em seu próximo prompt! 🚀",
        });
    }, 1000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-app-background p-4 font-sans">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-sm p-8 space-y-6 bg-sidebar rounded-2xl shadow-2xl shadow-black/30 border border-slate-800"
      >
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-slate-100">Recuperar Senha</h1>
          <p className="text-slate-400 text-sm">Insira seu e-mail para receber as instruções.</p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
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

          <Button type="submit" className="w-full btn-primary h-12 rounded-lg text-base" disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : ''}
            {loading ? 'Enviando...' : 'Enviar Link de Recuperação'}
          </Button>
        </form>
        
        <div className="text-center">
          <Link to="/login" className="flex items-center justify-center gap-2 text-sm font-semibold text-blue-400 hover:text-blue-300">
            <ArrowLeft className="w-4 h-4" />
            Voltar para o Login
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

export default ForgotPasswordPage;