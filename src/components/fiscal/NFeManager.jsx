// src/components/fiscal/NFeManager.jsx
import React, { useEffect, useState } from "react";
import { useData } from "@/contexts/SupabaseDataContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import NFeRecebidas from "@/components/fiscal/nfe/NFeRecebidas";
import { FileText, Settings, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/lib/customSupabaseClient";
import { useToast } from "@/components/ui/use-toast";

const NFeManager = () => {
  const { companies } = useData();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("recebidas");
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [hasActiveCert, setHasActiveCert] = useState(false);
  const [isLoadingCertStatus, setIsLoadingCertStatus] = useState(false);

  // Seleciona a primeira empresa automaticamente
  useEffect(() => {
    if (companies && companies.length > 0 && !selectedCompanyId) {
      setSelectedCompanyId(companies[0].id);
    }
  }, [companies, selectedCompanyId]);

  // Verifica se existe certificado ativo para a empresa selecionada
  useEffect(() => {
    const checkCertificate = async () => {
      if (!selectedCompanyId) {
        setHasActiveCert(false);
        return;
      }

      setIsLoadingCertStatus(true);

      const { data, error } = await supabase
        .from("nfe_certificates")
        .select("id")
        .eq("company_id", selectedCompanyId)
        .eq("active", true)
        .limit(1);

      if (error) {
        toast({
          variant: "destructive",
          title: "Erro ao verificar certificado",
          description: error.message
        });
        setHasActiveCert(false);
      } else {
        setHasActiveCert(Boolean(data && data.length > 0));
      }

      setIsLoadingCertStatus(false);
    };

    checkCertificate();
  }, [selectedCompanyId, toast]);

  const handleGoToConfig = () => {
    if (selectedCompanyId) {
      navigate(`/empresas/${selectedCompanyId}/certificado-digital`);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Gerenciador de NF-e
        </CardTitle>
        <CardDescription>Consulte e sincronize documentos fiscais eletrônicos.</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="max-w-md">
          <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione uma empresa" />
            </SelectTrigger>
            <SelectContent>
              {(companies || []).map((company) => (
                <SelectItem key={company.id} value={company.id}>
                  {company.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {!isLoadingCertStatus && !hasActiveCert && selectedCompanyId && (
          <div className="rounded-md border border-yellow-300 bg-yellow-50 p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-700" />
              <div className="space-y-1">
                <div className="font-medium text-yellow-900">Ação Necessária</div>
                <div className="text-sm text-yellow-900">
                  A empresa selecionada não possui um certificado digital ativo.
                </div>
                <div className="text-sm text-yellow-900">
                  Para sincronizar documentos, é necessário configurar um certificado digital A1 para o ambiente de
                  produção ou homologação.
                </div>
                <div className="pt-2">
                  <Button onClick={handleGoToConfig} size="sm" variant="outline">
                    <Settings className="mr-2 h-4 w-4" />
                    Configurar Certificado
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList>
            <TabsTrigger value="recebidas">Documentos Recebidos</TabsTrigger>
          </TabsList>

          <TabsContent value="recebidas" className="mt-4">
            <NFeRecebidas
              companyId={selectedCompanyId}
              isEnabled={hasActiveCert}
              isActive={activeTab === "recebidas"}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default NFeManager;