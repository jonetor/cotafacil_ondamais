import React from 'react';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Database, FileText, Users } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Link } from 'react-router-dom';
const FeatureCard = ({
  icon,
  title,
  description,
  delay
}) => <motion.div initial={{
  opacity: 0,
  y: 20
}} animate={{
  opacity: 1,
  y: 0
}} transition={{
  duration: 0.5,
  delay
}}>
        <Card className="bg-white/5 border-purple-400/20 h-full text-center backdrop-blur-sm card-hover">
          <CardHeader>
            <div className="mx-auto bg-purple-500/20 text-purple-300 rounded-full p-3 w-fit">
              {icon}
            </div>
            <CardTitle className="text-xl pt-4 text-slate-100">{title}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-400">{description}</p>
          </CardContent>
        </Card>
      </motion.div>;
const HomePage = () => {
  const {
    toast
  } = useToast();
  const handleNotImplemented = () => {
    toast({
      title: "Em breve!",
      description: "🚧 Esta funcionalidade ainda não foi implementada, mas não se preocupe! Você pode solicitá-la no seu próximo prompt! 🚀",
      variant: "default"
    });
  };
  return <>
          <Helmet>
            <title>CotaFacil - Crie Propostas Comerciais em Minutos</title>
            <meta name="description" content="Acelere suas vendas com o CotaFacil. Crie, gerencie e envie propostas comerciais profissionais de forma rápida e intuitiva." />
            <meta property="og:title" content="CotaFacil - Crie Propostas Comerciais em Minutos" />
            <meta property="og:description" content="Acelere suas vendas com o CotaFacil. Crie, gerencie e envie propostas comerciais profissionais de forma rápida e intuitiva." />
          </Helmet>
          <div className="min-h-screen w-full overflow-x-hidden relative flex flex-col items-center justify-center p-4 bg-slate-900">
            <div className="absolute pointer-events-none inset-0 flex items-center justify-center bg-slate-900 [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]"></div>
            <img-replace alt="Abstract network of interconnected nodes" className="absolute pointer-events-none inset-0 w-full h-full object-cover opacity-20 mix-blend-soft-light" />

            <header className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10">
              <Link to="/" className="flex items-center gap-2">
                <img-replace alt="CotaFacil Logo" className="h-8 w-8" />
                <span className="text-2xl font-bold text-white">CotaFacil</span>
              </Link>
              <Button asChild variant="ghost">
                <Link to="/login">Entrar</Link>
              </Button>
            </header>

            <main className="flex-1 flex flex-col items-center justify-center text-center z-10 w-full px-4">
              <motion.div initial={{
          opacity: 0,
          y: -20
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          duration: 0.7
        }} className="max-w-4xl mx-auto">
                <h1 className="text-4xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400 mb-4">
                  Crie Propostas Comerciais em Minutos
                </h1>
                <p className="text-lg md:text-xl text-slate-300 max-w-3xl mx-auto mb-8">
                  Acelere suas vendas com nossa ferramenta intuitiva. Crie, gerencie e envie propostas profissionais que impressionam seus clientes.
                </p>
                <Button asChild size="lg" className="btn-primary text-white font-bold text-lg">
                  <Link to="/login">Comece Agora - É Grátis</Link>
                </Button>
              </motion.div>
            </main>

            <section className="w-full max-w-6xl mx-auto p-4 mt-10 md:mt-20 z-10">
              <h2 className="text-3xl font-bold text-white mb-10 text-center">Tudo que você precisa para vender mais</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <FeatureCard icon={<Users size={32} />} title="Gestão de Clientes" description="Mantenha todos os seus contatos e históricos de negociação organizados em um só lugar." delay={0.2} />
                <FeatureCard icon={<Database size={32} />} title="Catálogo de Produtos" description="Cadastre seus produtos e serviços para adicionar às propostas com apenas um clique." delay={0.4} />
                <FeatureCard icon={<FileText size={32} />} title="Exportação para PDF" description="Gere propostas em PDF com aparência profissional e envie diretamente para seus clientes." delay={0.6} />
              </div>
            </section>

            <footer className="w-full p-4 mt-20 text-center text-slate-400 z-10">
              <p>&copy; {new Date().getFullYear()} CotaFacil. Todos os direitos reservados.</p>
            </footer>
          </div>
        </>;
};
export default HomePage;