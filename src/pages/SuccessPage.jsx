import React from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { CheckCircle, ShoppingBag } from 'lucide-react';

function SuccessPage() {
  return (
    <>
      <Helmet>
        <title>Pagamento Concluído! - CotaFacil</title>
        <meta name="description" content="Seu pagamento foi processado com sucesso. Obrigado pela sua compra!" />
      </Helmet>
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-lg text-center glass-card p-8 md:p-12 rounded-2xl shadow-2xl"
        >
          <CheckCircle className="h-20 w-20 text-green-400 mx-auto mb-6" />
          <h1 className="text-4xl font-bold text-white mb-4">Pagamento Concluído!</h1>
          <p className="text-gray-300 text-lg mb-8">
            Obrigado pela sua compra. Seu pedido está sendo processado e você receberá um e-mail de confirmação em breve.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/store">
              <Button size="lg" className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-3 text-lg">
                <ShoppingBag className="mr-2 h-5 w-5" />
                Continuar Comprando
              </Button>
            </Link>
            <Link to="/dashboard">
              <Button size="lg" variant="outline" className="w-full border-white/20 text-white hover:bg-white/10 py-3 text-lg">
                Ir para o Dashboard
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </>
  );
}

export default SuccessPage;