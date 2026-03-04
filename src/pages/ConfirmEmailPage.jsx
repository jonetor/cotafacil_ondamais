import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle } from 'lucide-react';

const ConfirmEmailPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = React.useState('loading');

  useEffect(() => {
    const timer = setTimeout(() => {
        setStatus('success');
        toast({
          title: "E-mail confirmado com sucesso!",
          description: "Agora você já pode fazer o login na plataforma.",
        });
        const redirectTimer = setTimeout(() => navigate('/login'), 3000);
        return () => clearTimeout(redirectTimer);
    }, 2000);

    return () => clearTimeout(timer);
  }, [navigate, toast]);
  

  return (
    <div className="min-h-screen flex items-center justify-center bg-app-background p-4 font-sans">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-sm p-8 space-y-6 bg-sidebar rounded-2xl shadow-2xl shadow-black/30 border border-slate-800 text-center"
      >
        {status === 'loading' && (
          <>
            <Loader2 className="mx-auto h-16 w-16 animate-spin text-blue-400" />
            <h2 className="text-2xl font-bold text-slate-100">Confirmando seu e-mail...</h2>
            <p className="text-slate-400">Aguarde um momento.</p>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
            <h2 className="text-2xl font-bold text-slate-100">E-mail Confirmado!</h2>
            <p className="text-slate-400">Você será redirecionado para a página de login em breve.</p>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default ConfirmEmailPage;