// src/components/fiscal/NFeManager.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { FileText, Settings, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/lib/customSupabaseClient";
import { useToast } from "@/components/ui/use-toast";

import NFeRecebidas from "@/components/fiscal/nfe/NFeRecebidas";
import { STATIC_COMPANIES } from "@/data/staticCompanies";

const NFeManager = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("recebidas");
  const [selectedCompanyId, setSelectedCompanyId] = useState(""); // ✅ será o cnpjDigits
  const [hasActiveCert, setHasActiveCert] = useState(false);
  const [isLoadingCertStatus, setIsLoadingCertStatus] = useState(false);

  const selectedCompany = useMemo(
    () => STATIC_COMPANIES.find((c) => c.id === selectedCompanyId) || null,
    [selectedCompanyId]
  );

  // Seleciona a primeira empresa automaticamente
  useEffect(() => {
    if (!selectedCompanyId && STATIC_COMPANIES.length > 0) {
      setSelectedCompanyId(STATIC_COMPANIES[0].id);
    }
  }, [selectedCompanyId]);

  // Verifica certificado ativo (se sua tabela usa company_id = cnpjDigits)
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
        .eq("company_id", selectedCompanyId) // ✅ company_id = cnpjDigits
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
        <CardDescription>
          Consulta e sincronização para os CNPJs definidos (lista fixa).
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="max-w-md">
          <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione uma empresa" />
            </SelectTrigger>
            <SelectContent>
              {STATIC_COMPANIES.map((company) => (
                <SelectItem key={company.id} value={company.id}>
                  {company.name} — {company.cnpj}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedCompany ? (
            <div className="mt-2 text-xs opacity-70">
              Razão: <b>{selectedCompany.razao_social}</b> | Fantasia: <b>{selectedCompany.nome_fantasia}</b>
            </div>
          ) : null}
        </div>

        {!isLoadingCertStatus && !hasActiveCert && selectedCompanyId && (
          <div className="rounded-md border border-yellow-300 bg-yellow-50 p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-700" />
              <div className="space-y-1">
                <div className="font-medium text-yellow-900">Ação Necessária</div>
                <div className="text-sm text-yellow-900">
                  A empresa selecionada não possui certificado digital ativo.
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
              companyId={selectedCompanyId}  // ✅ cnpjDigits
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