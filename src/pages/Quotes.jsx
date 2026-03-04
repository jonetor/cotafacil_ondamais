import React, { useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import { motion } from "framer-motion";
import { useData } from "@/contexts/SupabaseDataContext";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { Plus, Edit, Trash2, Search, FileDown, CheckCircle2 } from "lucide-react";
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

function formatCurrency(value) {
  return (Number(value) || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function safeFormatDate(dateLike) {
  if (!dateLike) return "-";
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return "-";
  try {
    return format(d, "dd/MM/yyyy");
  } catch {
    return "-";
  }
}

function safeTime(dateLike) {
  const d = new Date(dateLike);
  const t = d.getTime();
  return Number.isFinite(t) ? t : 0;
}

function stripVoallePrefix(id) {
  const s = String(id || "");
  return s.startsWith("voalle:") ? s.slice("voalle:".length) : s;
}

const Quotes = () => {
  const { quotes, clients, companies, users, addresses, sellers, deleteQuote, updateQuote } = useData();
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

  const openAndPrintUrl = (url) => {
    const w = window.open(url, "_blank");
    if (!w) {
      toast({
        variant: "destructive",
        title: "Pop-up bloqueado",
        description: "Permita pop-ups para imprimir a cotação.",
      });
      return;
    }
    w.onload = () => {
      try {
        w.focus();
        w.print();
      } catch {}
    };
  };

  const quotesWithClientNames = useMemo(() => {
    return safeQuotes
      .map((quote) => {
        const directName = String(quote.client_name || "").trim();
        if (directName) {
          return {
            ...quote,
            clientName: directName,
            __time: safeTime(quote.created_at),
          };
        }

        const qid = String(quote.client_id || "");
        const qidRaw = stripVoallePrefix(qid);

        const client =
          safeClients.find((c) => String(c.id) === qid) ||
          safeClients.find((c) => String(c.id) === qidRaw) ||
          safeClients.find((c) => stripVoallePrefix(c.id) === qidRaw);

        return {
          ...quote,
          clientName: client
            ? client.name || client.nome_razao || client.nome_fantasia
            : "Cliente não encontrado",
          __time: safeTime(quote.created_at),
        };
      })
      .sort((a, b) => (b.__time || 0) - (a.__time || 0));
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
    switch (String(status || "").toLowerCase()) {
      case "approved":
      case "aprovada":
        return "bg-green-500/20 text-green-300";
      case "rejected":
      case "reprovada":
        return "bg-red-500/20 text-red-300";
      default:
        return "bg-yellow-500/20 text-yellow-300";
    }
  };

  const handleDeleteQuote = async (id) => {
    try {
      await deleteQuote(id);

      toast({
        title: "Cotação excluída",
        description: "Registro removido com sucesso.",
      });
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Erro ao excluir",
        description: e?.message || String(e),
      });
    }
  };

  // 🔧 CORREÇÃO PRINCIPAL
  const handleApproveQuote = async (quote) => {
    try {
      const patch = {
        ...quote,
        status: "approved",
        updated_at: Date.now(),
      };

      await updateQuote(quote.id, patch);

      toast({
        title: "Cotação aprovada",
        description: `Proposta Nº ${quote.proposal_number || quote.proposta_numero || "-"}`,
      });
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Erro ao aprovar",
        description: e?.message || String(e),
      });
    }
  };

  const openPDFPreview = (quote) => {
    const company =
      safeCompanies.find((c) => String(c.id) === String(quote.company_id)) || null;

    const client =
      safeClients.find((c) => String(c.id) === String(quote.client_id)) || null;

    const autor =
      safeUsers.find((u) => String(u.id) === String(quote.user_id)) || null;

    const vendedor =
      safeSellers.find((s) => String(s.id) === String(quote.seller_id)) || null;

    const companyWithAddr = company
      ? {
          ...company,
          addresses: safeAddresses.filter(
            (a) => String(a.company_id) === String(company.id)
          ),
        }
      : null;

    const clientWithAddr = client
      ? {
          ...client,
          addresses: safeAddresses.filter(
            (a) => String(a.client_id) === String(client.id)
          ),
        }
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

  const handleConfirmPdf = async (template, meta) => {
    const action = meta?.action || "download";

    try {
      if (action === "print") {
        const { url } = await generateQuotePDF(
          { ...previewData, template },
          { download: false }
        );
        openAndPrintUrl(url);
        return;
      }

      await generateQuotePDF({ ...previewData, template });
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Erro ao gerar PDF",
        description: e?.message || String(e),
      });
    }
  };

  return (
    <div className="text-slate-200 min-h-full -m-8 p-8">
      <Helmet>
        <title>Cotações | ONDA+</title>
      </Helmet>

      <div className="space-y-6">

        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-slate-100">Cotações</h1>
              <p className="text-slate-400">Gerencie suas propostas</p>
            </div>

            <Button className="btn-primary" onClick={() => navigate("/cotacoes/novo")}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Cotação
            </Button>
          </div>
        </motion.div>

        <div className="relative w-full md:w-1/3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <Input
            placeholder="Buscar por nº ou cliente..."
            className="pl-10 input-field"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="floating-card p-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
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
                  <td className="py-3 px-2 font-semibold">
                    {quote.proposal_number || quote.proposta_numero}
                  </td>

                  <td className="py-3 px-2">{quote.clientName}</td>

                  <td className="py-3 px-2">
                    {safeFormatDate(quote.created_at)}
                  </td>

                  <td className="py-3 px-2 text-right">
                    {formatCurrency(quote.total_value || quote.total_geral)}
                  </td>

                  <td className="py-3 px-2">
                    <span className={`px-2 py-1 rounded-md text-xs ${getStatusClass(quote.status)}`}>
                      {quote.status || "pending"}
                    </span>
                  </td>

                  <td className="py-3 px-2">
                    <div className="flex justify-end gap-2">

                      <Button
                        variant="secondary"
                        className="btn-secondary"
                        onClick={() => openPDFPreview(quote)}
                      >
                        <FileDown className="w-4 h-4" />
                      </Button>

                      <Button
                        variant="secondary"
                        className="btn-secondary"
                        onClick={() => handleApproveQuote(quote)}
                        disabled={quote.status === "approved"}
                      >
                        <CheckCircle2 className="w-4 h-4 text-green-300" />
                      </Button>

                      <Button
                        variant="secondary"
                        className="btn-secondary"
                        onClick={() => navigate(`/cotacoes/editar/${quote.id}`)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="secondary" className="btn-secondary">
                            <Trash2 className="w-4 h-4 text-red-300" />
                          </Button>
                        </AlertDialogTrigger>

                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja excluir esta cotação?
                            </AlertDialogDescription>
                          </AlertDialogHeader>

                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteQuote(quote.id)}
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
            </tbody>
          </table>
        </div>

        <QuotePDFPreviewDialog
          isOpen={previewOpen}
          onClose={() => setPreviewOpen(false)}
          previewData={previewData}
          onConfirm={handleConfirmPdf}
        />

      </div>
    </div>
  );
};

export default Quotes;