import React from 'react';
    import { Helmet } from 'react-helmet';
    import NFeManager from '@/components/fiscal/NFeManager';
    import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";

    const NFePage = () => {
      return (
        <>
          <Helmet>
            <title>NFe (DF-e) - Módulo Fiscal</title>
            <meta name="description" content="Gerenciamento e distribuição de documentos fiscais eletrônicos." />
          </Helmet>
          <div className="container mx-auto p-4 md:p-6 lg:p-8">
             <Breadcrumb className="mb-6">
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/fiscal">Fiscal</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>NFe (DF-e)</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <NFeManager />
          </div>
        </>
      );
    };

    export default NFePage;