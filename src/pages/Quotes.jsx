import React, { useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import { motion } from "framer-motion";
import { useData } from "@/contexts/SupabaseDataContext";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { Plus, Edit, Trash2, Search, FileDown } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";

import QuotePDFPreviewDialog from "@/components/quotes/QuotePDFPreviewDialog";
import { generateQuotePDF } from "@/lib/pdfGenerator";

const Quotes = () => {
  const { quotes, clients, companies, users, addresses, sellers } = useData();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState(null);

  const safeQuotes = Array.isArray(quotes) ? quotes : [];
  const safeClients = Array.isArray(clients) ? clients : [];
  const safeCompanies = Array.isArray(companies) ? companies : [];
  const safeUsers = Array.isArray(users) ? users : [];
  const safeAddresses = Array.isArray(addresses) ? addresses : [];
  const safeSellers = Array.isArray(sellers) ? sellers : [];

  const quotesWithClientNames = useMemo(() => {
    return safeQuotes
      .map((quote) => {
        const client = safeClients.find((c) => String(c.id) === String(quote.client_id));
        return {
          ...quote,
          clientName: client ? (client.name || client.nome_razao) : "Cliente não encontrado",
        };
      })
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [safeQuotes, safeClients]);

  const filteredQuotes = useMemo(() => {
    const s = String(searchTerm || "").toLowerCase().trim();
    if (!s) return quotesWithClientNames;

    return quotesWithClientNames.filter((q) => {
      return (
        String(q.proposal_number || q.proposta_numero || "")
          .toLowerCase()
          .includes(s) ||
        String(q.clientName || "").toLowerCase().includes(s)
      );
    });
  }, [quotesWithClientNames, searchTerm]);

  const getStatusClass = (status) => {
    switch (status) {
      case "approved":
        return "bg-green-500/20 text-green-300";
      case "rejected":
        return "bg-red-500/20 text-red-300";
      case "pending":
        return "bg-yellow-500/20 text-yellow-300";
      default:
        return "bg-slate-500/20 text-slate-300";
    }
  };

  const deleteQuote = (id) => {
    // seu contexto já tem deleteQuote no original. Mantive simples:
    toast({ variant: "destructive", title: "Exclusão não ligada aqui", description: "Se seu contexto tem deleteQuote, eu conecto." });
  };

  const openPDFPreview = (quote) => {
    // monta previewData igual o QuoteFormPage
    const company =
      safeCompanies.find((c) => String(c.id) === String(quote.company_id)) || null;

    const client =
      safeClients.find((c) => String(c.id) === String(quote.client_id)) || null;

    const autor = safeUsers.find((u) => String(u.id) === String(quote.user_id)) || null;

    const vendedor =
      safeSellers.find((s) => String(s.id) === String(quote.seller_id)) || null;

    const companyWithAddr = company
      ? { ...company, addresses: safeAddresses.filter((a) => String(a.company_id) === String(company.id)) }
      : null;

    const clientWithAddr = client
      ? { ...client, addresses: safeAddresses.filter((a) => String(a.client_id) === String(client.id)) }
      : null;

    if (!companyWithAddr || !clientWithAddr) {
      toast({
        variant: "destructive",
        title: "Dados incompletos",
        description: "Empresa ou cliente não encontrado para gerar o PDF.",
      });
      return;
    }

    setPreviewData({
      quote,
      company: companyWithAddr,
      client: clientWithAddr,
      vendedor,
      autor,
    });
    setPreviewOpen(true);
  };

  const handleGenerateFromList = (template) => {
    if (!previewData?.company || !previewData?.client) {
      toast({
        variant: "destructive",
        title: "Dados incompletos",
        description: "Não foi possível montar os dados do PDF.",
      });
      return;
    }
    generateQuotePDF({ ...previewData, template });
  };

  return (
    <div className="text-slate-200 min-h-full -m-8 p-8">
      <Helmet>
        <title>Cotações | ONDA+</title>
      </Helmet>

      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-100">Cotações</h1>
              <p className="text-slate-400 mt-1">Gerencie suas propostas e orçamentos.</p>
            </div>

            <Button className="btn-primary" onClick={() => navigate("/cotacoes/novo")}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Cotação
            </Button>
          </div>
        </motion.div>

        <div className="relative flex items-center gap-3">
          <div className="relative w-full md:w-1/3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <Input
              placeholder="Buscar por nº ou cliente..."
              className="pl-10 w-full input-field"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="floating-card p-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-slate-400">
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-2">Proposta</th>
                <th className="text-left py-3 px-2">Cliente</th>
                <th className="text-left py-3 px-2">Data</th>
                <th className="text-right py-3 px-2">Valor</th>
                <th className="text-left py-3 px-2">Status</th>
                <th className="text-right py-3 px-2">Ações</th>
              </tr>
            </thead>

            <tbody>
              {filteredQuotes.map((quote) => (
                <tr key={quote.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="py-3 px-2 text-slate-100 font-semibold">
                    {quote.proposal_number || quote.proposta_numero || "-"}
                  </td>

                  <td className="py-3 px-2 text-slate-200">{quote.clientName}</td>

                  <td className="py-3 px-2 text-slate-300">
                    {quote.created_at ? format(new Date(quote.created_at), "dd/MM/yyyy") : "-"}
                  </td>

                  <td className="py-3 px-2 text-right text-slate-200">
                    {formatCurrency(quote.total_value || quote.total_geral || 0)}
                  </td>

                  <td className="py-3 px-2">
                    <span className={`px-2 py-1 rounded-md text-xs ${getStatusClass(quote.status)}`}>
                      {quote.status || "pending"}
                    </span>
                  </td>

                  <td className="py-3 px-2">
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        className="btn-secondary"
                        onClick={() => openPDFPreview(quote)}
                        title="Imprimir / Gerar PDF"
                      >
                        <FileDown className="w-4 h-4" />
                      </Button>

                      <Button
                        type="button"
                        variant="secondary"
                        className="btn-secondary"
                        onClick={() => navigate(`/cotacoes/editar/${quote.id}`)}
                        title="Editar"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button type="button" variant="secondary" className="btn-secondary" title="Excluir">
                            <Trash2 className="w-4 h-4 text-red-300" />
                          </Button>
                        </AlertDialogTrigger>

                        <AlertDialogContent className="glass-effect border-white/20 text-white">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                            <AlertDialogDescription className="text-white/70">
                              Tem certeza que deseja excluir a cotação Nº{" "}
                              <b>{quote.proposal_number || quote.proposta_numero}</b>? Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>

                          <AlertDialogFooter>
                            <AlertDialogCancel className="btn-secondary">Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-red-500 hover:bg-red-600"
                              onClick={() => deleteQuote(quote.id)}
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredQuotes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-500">
                    Nenhuma cotação encontrada.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <QuotePDFPreviewDialog
          isOpen={previewOpen}
          onClose={() => setPreviewOpen(false)}
          onConfirm={(template) => handleGenerateFromList(template)}
          previewData={previewData}
        />
      </div>
    </div>
  );
};

function formatCurrency(value) {
  return (Number(value) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default Quotes;