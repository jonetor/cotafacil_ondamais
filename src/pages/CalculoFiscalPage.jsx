import React, { useState } from 'react';
    import { Helmet } from 'react-helmet';
    import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
    import CalculoEntradaNF from '@/components/fiscal/CalculoEntradaNF';
    import CalculoValorVenda from '@/components/fiscal/CalculoValorVenda';
    import { FileText, DollarSign } from 'lucide-react';
    import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";

    const CalculoFiscalPage = () => {
      const [activeTab, setActiveTab] = useState("entrada-nf");

      return (
        <>
          <Helmet>
            <title>Cálculo Fiscal - Módulo Fiscal</title>
            <meta name="description" content="Ferramentas para cálculo de impostos de entrada e formação de preço de venda." />
          </Helmet>
          <div className="container mx-auto p-4 md:p-6 lg:p-8">
            <Breadcrumb className="mb-6">
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/fiscal">Fiscal</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Cálculo Fiscal</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-card border border-border">
                <TabsTrigger value="entrada-nf">
                  <FileText className="mr-2 h-4 w-4" />
                  Cálculo de Entrada NF
                </TabsTrigger>
                <TabsTrigger value="valor-venda">
                  <DollarSign className="mr-2 h-4 w-4" />
                  Cálculo de Valor de Venda
                </TabsTrigger>
              </TabsList>
              <TabsContent value="entrada-nf" className="mt-4">
                <CalculoEntradaNF />
              </TabsContent>
              <TabsContent value="valor-venda" className="mt-4">
                <CalculoValorVenda />
              </TabsContent>
            </Tabs>
          </div>
        </>
      );
    };

    export default CalculoFiscalPage;