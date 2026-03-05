import React, { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import { motion } from "framer-motion";
import { useData } from "@/contexts/SupabaseDataContext";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label"; // ✅ FALTAVA ISSO (quebrava o front)
import { useNavigate } from "react-router-dom";
import { Plus, Edit, Trash2, Search, FileDown, CheckCircle2, Pencil } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription as AlertDesc,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";

import QuotePDFPreviewDialog from "@/components/quotes/QuotePDFPreviewDialog";
import { generateQuotePDF } from "@/lib/pdfGenerator";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

function formatCurrency(value) {
  return (Number(value) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
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

const API_BASE = ""; // se usa proxy, deixe vazio

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!res.ok) throw new Error(data?.error || data?.message || text || `HTTP ${res.status}`);
  return data;
}

function getInfoText(q) {
  const contact = (q.contact_person || q.contactPerson || "").toString().trim();
  const payment = (q.payment_terms || q.paymentTerms || "").toString().trim();
  const freight = (q.freight_type || q.freightType || "").toString().trim();
  const delivery = (q.delivery_location || q.deliveryLocation || "").toString().trim();

  const parts = [];
  if (contact) parts.push(`Contato: ${contact}`);
  if (payment) parts.push(`Pgto: ${payment}`);
  if (freight) parts.push(`Frete: ${freight}`);
  if (delivery) parts.push(`Entrega: ${delivery}`);
  return parts.join(" • ");
}

function getDescription(q) {
  // ✅ vamos usar notes como “descrição” (já existe no QuoteFormPage e no backend)
  return String(q.notes || q.description || q.descricao || "").trim();
}

export default function Quotes() {
  const { quotes, clients, companies, users, addresses, sellers, deleteQuote, reloadQuotes, updateQuote } = useData();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState(null);

  const [localQuotes, setLocalQuotes] = useState([]);
  useEffect(() => {
    setLocalQuotes(Array.isArray(quotes) ? quotes : []);
  }, [quotes]);

  // modal descrição
  const [descOpen, setDescOpen] = useState(false);
  const [descQuote, setDescQuote] = useState(null);
  const [descValue, setDescValue] = useState("");
  const [savingDesc, setSavingDesc] = useState(false);

  const safeQuotes = Array.isArray(localQuotes) ? localQuotes : [];
  const safeClients = Array.isArray(clients) ? clients : [];
  const safeCompanies = Array.isArray(companies) ? companies : [];
  const safeUsers = Array.isArray(users) ? users : [];
  const safeAddresses = Array.isArray(addresses) ? addresses : [];
  const safeSellers = Array.isArray(sellers) ? sellers : [];

  const openAndPrintUrl = (url) => {
    const w = window.open(url, "_blank");
    if (!w) {
      toast({ variant: "destructive", title: "Pop-up bloqueado", description: "Permita pop-ups para imprimir a cotação." });
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
        const directName = String(quote.client_name || quote.clientName || "").trim();
        if (directName) {
          return { ...quote, clientName: directName, __time: safeTime(quote.created_at) };
        }

        const qid = String(quote.client_id || "");
        const qidRaw = stripVoallePrefix(qid);

        const client =
          safeClients.find((c) => String(c.id) === qid) ||
          safeClients.find((c) => String(c.id) === qidRaw) ||
          safeClients.find((c) => stripVoallePrefix(c.id) === qidRaw);

        return {
          ...quote,
          clientName: client ? (client.name || client.nome_razao || client.nome_fantasia) : "Cliente",
          __time: safeTime(quote.created_at),
        };
      })
      .sort((a, b) => (b.__time || 0) - (a.__time || 0));
  }, [safeQuotes, safeClients]);

  const filteredQuotes = useMemo(() => {
    const s = String(searchTerm || "").toLowerCase().trim();
    if (!s) return quotesWithClientNames;

    return quotesWithClientNames.filter((q) => {
      const info = getInfoText(q).toLowerCase();
      const desc = getDescription(q).toLowerCase();
      return (
        String(q.proposal_number || "").toLowerCase().includes(s) ||
        String(q.clientName || "").toLowerCase().includes(s) ||
        info.includes(s) ||
        desc.includes(s)
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
      setLocalQuotes((prev) => prev.filter((q) => String(q.id) !== String(id)));
      if (typeof deleteQuote !== "function") {
        toast({ variant: "destructive", title: "deleteQuote não encontrado", description: "SupabaseDataContext precisa expor deleteQuote(id)." });
        return;
      }
      await deleteQuote(id);
      toast({ title: "Cotação excluída", description: "Registro removido com sucesso." });
      if (typeof reloadQuotes === "function") await reloadQuotes();
    } catch (e) {
      if (typeof reloadQuotes === "function") await reloadQuotes();
      toast({ variant: "destructive", title: "Erro ao excluir", description: e?.message || String(e) });
    }
  };

  const handleApproveQuote = async (quote) => {
    try {
      await apiFetch(`/api/quotes/${quote.id}/approve`, { method: "POST" });
      setLocalQuotes((prev) =>
        prev.map((q) => (String(q.id) === String(quote.id) ? { ...q, status: "approved", updated_at: Date.now() } : q))
      );
      toast({ title: "Cotação aprovada", description: `Proposta Nº ${quote.proposal_number || "-"}` });
      if (typeof reloadQuotes === "function") await reloadQuotes();
    } catch (e) {
      if (typeof reloadQuotes === "function") await reloadQuotes();
      toast({ variant: "destructive", title: "Erro ao aprovar", description: e?.message || String(e) });
    }
  };

  const handleEditQuote = async (quote) => {
    try {
      const full = await apiFetch(`/api/quotes/${quote.id}`, { method: "GET" });
      navigate(`/cotacoes/editar/${quote.id}`, { state: { quote: full } });
    } catch (e) {
      toast({ variant: "destructive", title: "Erro ao abrir edição", description: e?.message || String(e) });
    }
  };

  const openPDFPreview = async (quote) => {
    try {
      const full = await apiFetch(`/api/quotes/${quote.id}`, { method: "GET" });

      const items = Array.isArray(full.items) ? full.items : [];
      const normalizedQuote = {
        ...full,
        items: items.map((it) => ({
          ...it,
          quantity: Number(it.quantity || 0),
          unit_price: Number(it.unit_price || 0),
          total_price: Number(it.total_price || (Number(it.quantity || 0) * Number(it.unit_price || 0))),
        })),
      };

      let company = safeCompanies.find((c) => String(c.id) === String(normalizedQuote.company_id)) || null;
      if (!company) {
        const companyName = String(normalizedQuote.company_name || "Fibra Onda+ LTDA");
        const companyDoc = String(normalizedQuote.company_document || "14.429.925/0001-67");
        company = {
          id: String(normalizedQuote.company_id || "static"),
          name: companyName,
          cnpj: companyDoc,
          razao_social: normalizedQuote.company_razao_social || companyName,
          nome_fantasia: normalizedQuote.company_nome_fantasia || companyName,
        };
      }

      const qClientId = String(normalizedQuote.client_id || "");
      const qClientIdRaw = stripVoallePrefix(qClientId);

      let client =
        safeClients.find((c) => String(c.id) === qClientId) ||
        safeClients.find((c) => String(c.id) === qClientIdRaw) ||
        safeClients.find((c) => stripVoallePrefix(c.id) === qClientIdRaw) ||
        null;

      if (!client) {
        const clientName = String(normalizedQuote.client_name || normalizedQuote.clientName || "Cliente");
        const clientDoc = String(normalizedQuote.client_document || "");
        client = { id: qClientId || qClientIdRaw || "client", name: clientName, nome_razao: clientName, cpf_cnpj: clientDoc };
      }

      const autor = safeUsers.find((u) => String(u.id) === String(normalizedQuote.user_id)) || null;
      const vendedor = safeSellers.find((s) => String(s.id) === String(normalizedQuote.seller_id)) || null;

      const companyWithAddr = company
        ? { ...company, addresses: safeAddresses.filter((a) => String(a.company_id) === String(company.id)) }
        : null;

      const clientWithAddr = client
        ? { ...client, addresses: safeAddresses.filter((a) => String(a.client_id) === String(client.id)) }
        : null;

      setPreviewData({
        quote: normalizedQuote,
        company: companyWithAddr || company,
        client: clientWithAddr || client,
        vendedor,
        autor,
      });

      setPreviewOpen(true);
    } catch (e) {
      toast({ variant: "destructive", title: "Erro ao gerar PDF", description: e?.message || String(e) });
    }
  };

  const handleConfirmPdf = async (template, meta) => {
    const action = meta?.action || "download";
    if (!previewData?.company || !previewData?.client) {
      toast({ variant: "destructive", title: "Dados incompletos", description: "Não foi possível montar os dados do PDF." });
      return;
    }

    const resultToUrl = (result) => {
      if (!result) return null;
      if (typeof result === "string") return result;
      if (result?.url && typeof result.url === "string") return result.url;
      const blob = result?.blob instanceof Blob ? result.blob : result instanceof Blob ? result : null;
      if (blob) return URL.createObjectURL(blob);
      return null;
    };

    try {
      if (action === "print") {
        const result = await generateQuotePDF({ ...previewData, template }, { download: false });
        const url = resultToUrl(result);
        if (url) {
          openAndPrintUrl(url);
          return;
        }
        await generateQuotePDF({ ...previewData, template });
        toast({ title: "PDF gerado", description: "O gerador baixou o PDF, mas não retornou URL/Blob para impressão automática." });
        return;
      }

      await generateQuotePDF({ ...previewData, template });
    } catch (e) {
      toast({
        variant: "destructive",
        title: action === "print" ? "Erro ao imprimir" : "Erro ao gerar PDF",
        description: e?.message || String(e),
      });
    }
  };

  // ✅ DESCRIÇÃO: abre editor e salva em notes
  const openDescriptionEditor = (quote) => {
    setDescQuote(quote);
    setDescValue(getDescription(quote));
    setDescOpen(true);
  };

  const saveDescription = async () => {
    if (!descQuote?.id) return;
    try {
      setSavingDesc(true);
      if (typeof updateQuote !== "function") throw new Error("updateQuote não disponível no DataContext.");

      await updateQuote(descQuote.id, { notes: descValue });

      // atualiza UI imediata
      setLocalQuotes((prev) =>
        prev.map((q) => (String(q.id) === String(descQuote.id) ? { ...q, notes: descValue } : q))
      );

      if (typeof reloadQuotes === "function") await reloadQuotes();

      toast({ title: "Descrição salva", description: "A descrição foi atualizada com sucesso." });
      setDescOpen(false);
    } catch (e) {
      toast({ variant: "destructive", title: "Erro ao salvar descrição", description: e?.message || String(e) });
    } finally {
      setSavingDesc(false);
    }
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
              placeholder="Buscar por nº, cliente, info ou descrição..."
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
                <th className="text-left py-3 px-2">Informações</th>
                <th className="text-left py-3 px-2">Descrição</th>
                <th className="text-left py-3 px-2">Data</th>
                <th className="text-right py-3 px-2">Valor</th>
                <th className="text-left py-3 px-2">Status</th>
                <th className="text-right py-3 px-2">Ações</th>
              </tr>
            </thead>

            <tbody>
              {filteredQuotes.map((quote) => (
                <tr key={quote.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="py-3 px-2 text-slate-100 font-semibold">{quote.proposal_number || "-"}</td>
                  <td className="py-3 px-2 text-slate-200">{quote.clientName}</td>

                  <td className="py-3 px-2 text-slate-300">
                    <div className="max-w-[420px] whitespace-nowrap overflow-hidden text-ellipsis" title={getInfoText(quote)}>
                      {getInfoText(quote) || "-"}
                    </div>
                  </td>

                  <td className="py-3 px-2 text-slate-300">
                    <div className="flex items-center gap-2">
                      <div className="max-w-[360px] whitespace-nowrap overflow-hidden text-ellipsis" title={getDescription(quote)}>
                        {getDescription(quote) || "-"}
                      </div>
                      <Button type="button" variant="secondary" className="btn-secondary" onClick={() => openDescriptionEditor(quote)} title="Editar descrição">
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>

                  <td className="py-3 px-2 text-slate-300">{safeFormatDate(quote.created_at)}</td>
                  <td className="py-3 px-2 text-right text-slate-200">{formatCurrency(quote.total_value || 0)}</td>

                  <td className="py-3 px-2">
                    <span className={`px-2 py-1 rounded-md text-xs ${getStatusClass(quote.status)}`}>
                      {quote.status || "pending"}
                    </span>
                  </td>

                  <td className="py-3 px-2">
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="secondary" className="btn-secondary" onClick={() => openPDFPreview(quote)} title="Gerar/Imprimir PDF">
                        <FileDown className="w-4 h-4" />
                      </Button>

                      <Button
                        type="button"
                        variant="secondary"
                        className="btn-secondary"
                        onClick={() => handleApproveQuote(quote)}
                        title="Aprovar cotação"
                        disabled={String(quote.status || "").toLowerCase() === "approved"}
                      >
                        <CheckCircle2 className="w-4 h-4 text-green-300" />
                      </Button>

                      <Button type="button" variant="secondary" className="btn-secondary" onClick={() => handleEditQuote(quote)} title="Editar">
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
                            <AlertDesc className="text-white/70">
                              Tem certeza que deseja excluir a cotação Nº <b>{quote.proposal_number || "-"}</b>? Esta ação não pode ser desfeita.
                            </AlertDesc>
                          </AlertDialogHeader>

                          <AlertDialogFooter>
                            <AlertDialogCancel className="btn-secondary">Cancelar</AlertDialogCancel>
                            <AlertDialogAction className="bg-red-500 hover:bg-red-600" onClick={() => handleDeleteQuote(quote.id)}>
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
                  <td colSpan={8} className="py-10 text-center text-slate-500">
                    Nenhuma cotação encontrada.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <QuotePDFPreviewDialog isOpen={previewOpen} onClose={() => setPreviewOpen(false)} previewData={previewData} onConfirm={handleConfirmPdf} />
      </div>

      {/* ✅ MODAL EDITAR DESCRIÇÃO */}
      <Dialog open={descOpen} onOpenChange={setDescOpen}>
        <DialogContent className="glass-effect border-white/20 text-white max-w-2xl" aria-describedby="desc-dialog">
          <DialogHeader>
            <DialogTitle className="text-white">Descrição da Cotação</DialogTitle>
            <DialogDescription id="desc-dialog" className="text-white/70">
              Essa descrição será salva no campo <b>notes</b> da cotação (mesmo campo usado no QuoteFormPage).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Label className="text-white/80">Descrição</Label>
            <textarea
              className="input-field min-h-[120px] w-full resize-none"
              value={descValue}
              onChange={(e) => setDescValue(e.target.value)}
              placeholder="Ex: Proposta cliente pediu desconto / instalação + materiais / etc."
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" className="btn-secondary" onClick={() => setDescOpen(false)}>
                Cancelar
              </Button>
              <Button type="button" className="btn-primary" onClick={saveDescription} disabled={savingDesc}>
                {savingDesc ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}