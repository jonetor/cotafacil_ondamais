// src/components/fiscal/nfe/NFeRecebidas.jsx
import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/customSupabaseClient";
import { RefreshCw, Loader2, Filter } from "lucide-react";
import { format } from "date-fns";
import { formatCurrencyBR } from "@/lib/utils";
import nfeSync from "@/services/nfeService";

const NFeRecebidas = ({ companyId, isEnabled, isActive }) => {
  const { toast } = useToast();

  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const fetchDocuments = useCallback(async () => {
    if (!companyId) {
      setDocuments([]);
      return;
    }

    setIsLoading(true);

    const { data, error } = await supabase
      .from("nfe_documents")
      .select("*")
      .eq("company_id", companyId)
      .order("dhemi", { ascending: false })
      .limit(100);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao buscar documentos",
        description: error.message
      });
    } else {
      setDocuments(data || []);
    }

    setIsLoading(false);
  }, [toast, companyId]);

  // ✅ quando a aba "Recebidas" for selecionada OU quando trocar companyId
  useEffect(() => {
    if (isActive) fetchDocuments();
  }, [isActive, companyId, fetchDocuments]);

  const handleSync = async () => {
    if (!companyId) {
      toast({
        variant: "destructive",
        title: "Selecione uma empresa",
        description: "Escolha uma empresa para sincronizar."
      });
      return;
    }

    if (!isEnabled) {
      toast({
        variant: "destructive",
        title: "Certificado necessário",
        description: "Configure um certificado digital ativo para habilitar a sincronização."
      });
      return;
    }

    setIsSyncing(true);

    try {
      const result = await nfeSync(companyId);

      toast({
        title: "Sincronização Concluída",
        description: result?.message || "Sincronização finalizada."
      });

      await fetchDocuments();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro na Sincronização",
        description: error?.message || String(error)
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Documentos Fiscais Recebidos</CardTitle>
        <CardDescription>Lista dos últimos documentos sincronizados da SEFAZ.</CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <Button variant="outline" size="sm" disabled>
            <Filter className="mr-2 h-4 w-4" />
            Filtrar
          </Button>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchDocuments}
              disabled={isLoading || isSyncing || !companyId}
            >
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Atualizar
            </Button>

            <Button size="sm" onClick={handleSync} disabled={isSyncing || !companyId || !isEnabled}>
              {isSyncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Sincronizar Agora
            </Button>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data Emissão</TableHead>
              <TableHead>Chave NFe</TableHead>
              <TableHead>Emitente</TableHead>
              <TableHead>Schema</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Situação</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                </TableCell>
              </TableRow>
            ) : documents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  Nenhum documento encontrado.
                </TableCell>
              </TableRow>
            ) : (
              documents.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell>{doc.dhemi ? format(new Date(doc.dhemi), "dd/MM/yyyy HH:mm") : "N/A"}</TableCell>
                  <TableCell className="font-mono text-xs">{doc.chnfe || "N/A"}</TableCell>
                  <TableCell>{doc.emit_cnpj || "N/A"}</TableCell>
                  <TableCell>{doc.schema || "N/A"}</TableCell>
                  <TableCell>{doc.vnf ? formatCurrencyBR(doc.vnf) : "N/A"}</TableCell>
                  <TableCell>{doc.cstat || "N/A"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default NFeRecebidas;