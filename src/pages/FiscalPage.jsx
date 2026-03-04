import React from 'react';
    import { Helmet } from 'react-helmet';
    import { Link } from 'react-router-dom';
    import { motion } from 'framer-motion';
    import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
    import { Calculator, FileText, ArrowRight } from 'lucide-react';

    const FiscalPage = () => {
      const modules = [
        {
          title: 'Cálculo Fiscal',
          description: 'Análise de notas de entrada e formação de preço de venda.',
          icon: <Calculator className="h-8 w-8 text-primary" />,
          link: '/fiscal/calculo',
        },
        {
          title: 'NFe (DF-e)',
          description: 'Gerenciamento e distribuição de documentos fiscais eletrônicos.',
          icon: <FileText className="h-8 w-8 text-primary" />,
          link: '/fiscal/nfe',
        },
      ];

      const cardVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
      };

      return (
        <>
          <Helmet>
            <title>Módulo Fiscal - CotaFácil</title>
            <meta name="description" content="Hub central para todas as operações fiscais." />
          </Helmet>
          <div className="container mx-auto p-4 md:p-6 lg:p-8">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="text-3xl font-bold text-foreground mb-2">Módulo Fiscal</h1>
              <p className="text-muted-foreground mb-8">Selecione uma ferramenta para começar.</p>
            </motion.div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {modules.map((mod, index) => (
                <motion.div
                  key={mod.title}
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <Link to={mod.link}>
                    <Card className="h-full flex flex-col justify-between hover:border-primary hover:shadow-lg transition-all duration-300 group">
                      <CardHeader>
                        <div className="flex items-start gap-4">
                          {mod.icon}
                          <div>
                            <CardTitle>{mod.title}</CardTitle>
                            <CardDescription>{mod.description}</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-end text-sm font-semibold text-primary">
                          Acessar
                          <ArrowRight className="ml-2 h-4 w-4 transform transition-transform duration-300 group-hover:translate-x-1" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </>
      );
    };

    export default FiscalPage;