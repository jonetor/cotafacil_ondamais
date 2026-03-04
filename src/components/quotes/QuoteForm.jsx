import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import ClientSearchSelect from "@/components/quotes/ClientSearchSelect";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useData } from "@/contexts/SupabaseDataContext";
import { useToast } from "@/components/ui/use-toast";
import {
  Save,
  Building,
  FileDown,
  User,
  UserSquare,
  Printer,
} from "lucide-react";
import QuoteItemsManager from "@/components/quotes/QuoteItemsManager";
import QuoteNotes from "@/components/quotes/QuoteNotes";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import QuoteTotals from "@/components/quotes/QuoteTotals";
import { generateQuotePDF } from "@/lib/pdfGenerator";
import QuotePDFPreviewDialog from "@/components/quotes/QuotePDFPreviewDialog";
import { Input } from "@/components/ui/input";

import { listSellers } from "@/services/sellers";
import { useAuth } from "@/contexts/SupabaseAuthContext";

const onlyDigits = (s) => String(s || "").replace(/\D/g, "");

const DEFAULT_COMPANY = {
  name: "Fibra Onda+ LTDA",
  cnpj: "14.429.925/0001-67",
  cnpjDigits: "14429925000167",
};

const readClienteFromStorage = () => {
  try {
    return JSON.parse(localStorage.getItem("cotacao_cliente") || "null");
  } catch {
    return null;
  }
};

const getNextProposalNumber = (quotes) => {
  if (!quotes || quotes.length === 0) return 1;
  const maxNumber = Math.max(...quotes.map((q) => parseInt(q.proposal_number, 10) || 0));
  return maxNumber + 1;
};

function formatClientLabel(c) {
  const doc =
    c?.cpf_cnpj ||
    c?.cpfCnpj ||
    c?.cpf_cnpj_digits ||
    c?.txIdFormated ||
    c?.txId ||
    c?.document ||
    "";
  const nome = c?.name || c?.nome_razao || c?.nome_fantasia || c?.nome || "";
  const docTxt = String(doc).trim();
  const nomeTxt = String(nome).trim();
  if (docTxt && nomeTxt) return `${docTxt} - ${nomeTxt}`;
  return nomeTxt || docTxt || "Cliente";
}

function stripVoallePrefix(id) {
  const s = String(id || "");
  return s.startsWith("voalle:") ? s.slice("voalle:".length) : s;
}

export default function QuoteForm() {
  const {
    clients,
    quotes,
    addQuote,
    companies,
    users,
    user: supabaseUser,
    addresses,
    sellers: supabaseSellers,
  } = useData();

  const { user: bffUser } = useAuth(); // {sub, email, role, name}
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();

  const [bffSellers, setBffSellers] = useState([]);
  const [externalClientOption, setExternalClientOption] = useState(null);
  const [externalCompanyOption, setExternalCompanyOption] = useState(null);

  const [currentQuote, setCurrentQuote] = useState({
    id: null,
    company_id: "",
    client_id: "",
    client_name: "",
    client_document: "",
    seller_id: "",
    items: [],
    status: "pending",
    notes: "",
    payment_terms: "",
    freight_type: "CIF",
    delivery_location: "",
    proposal_number: "",
    revision: 0,
    contactPerson: "",
    validity_date: "",
    created_at: new Date().toISOString(),
    user_id: "",
  });

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

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

  const normalizePdfResultToUrl = (result) => {
    if (!result) return null;
    if (typeof result === "string") return result;
    if (result?.url && typeof result.url === "string") return result.url;

    const blob = result?.blob instanceof Blob ? result.blob : result instanceof Blob ? result : null;
    if (blob) return URL.createObjectURL(blob);
    return null;
  };

  useEffect(() => {
    (async () => {
      try {
        const list = await listSellers();
        setBffSellers(Array.isArray(list) ? list : []);
      } catch (e) {
        console.error(e);
        setBffSellers([]);
        toast({
          variant: "destructive",
          title: "Erro ao carregar vendedores",
          description: String(e?.message || e),
        });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const userId = supabaseUser?.id || "";

    if (id) {
      const quote = (quotes || []).find((q) => String(q.id) === String(id));
      if (quote) {
        setCurrentQuote({
          ...quote,
          user_id: userId,
          items: quote.items || [],
          client_id: String(quote.client_id || ""),
          client_name: String(quote.client_name || ""),
          client_document: String(quote.client_document || ""),
        });
      }
      return;
    }

    setCurrentQuote((prev) => ({
      ...prev,
      proposal_number: String(getNextProposalNumber(quotes)).padStart(5, "0"),
      user_id: userId,
    }));
  }, [id, quotes, supabaseUser]);

  useEffect(() => {
    if (id) return;
    if (!bffUser?.sub) return;

    setCurrentQuote((prev) => {
      if (prev.seller_id) return prev;
      return { ...prev, seller_id: String(bffUser.sub) };
    });
  }, [bffUser, id]);

  useEffect(() => {
    if (!companies || companies.length === 0) return;

    const found =
      companies.find((c) => onlyDigits(c?.cnpj) === DEFAULT_COMPANY.cnpjDigits) ||
      companies.find((c) => String(c?.name || "").toLowerCase().includes("fibra onda"));

    if (found) {
      setExternalCompanyOption(null);
      setCurrentQuote((prev) => ({ ...prev, company_id: String(found.id) }));
    } else {
      const tmp = {
        id: `static:${DEFAULT_COMPANY.cnpjDigits}`,
        name: `${DEFAULT_COMPANY.name} (${DEFAULT_COMPANY.cnpj})`,
        cnpj: DEFAULT_COMPANY.cnpj,
      };
      setExternalCompanyOption(tmp);
      setCurrentQuote((prev) => ({ ...prev, company_id: String(tmp.id) }));
    }
  }, [companies]);

  useEffect(() => {
    const cli = location.state?.cliente || readClienteFromStorage();
    if (!cli) return;

    const docDigits = onlyDigits(cli.cpf_cnpj || cli.txIdFormated || cli.txId || "");
    const nome = cli.nome_razao || cli.name || cli.nome || "";

    const matchInternal =
      (clients || []).find((c) => onlyDigits(c?.cpf_cnpj) === docDigits) ||
      (clients || []).find((c) => onlyDigits(c?.txId) === docDigits);

    if (matchInternal) {
      setExternalClientOption(null);
      setCurrentQuote((prev) => ({
        ...prev,
        client_id: String(matchInternal.id),
        client_name: String(matchInternal.name || matchInternal.nome_razao || matchInternal.nome_fantasia || nome),
        client_document: String(matchInternal.cpf_cnpj || matchInternal.txIdFormated || matchInternal.txId || ""),
        contactPerson: prev.contactPerson?.trim()
          ? prev.contactPerson
          : (matchInternal.name || matchInternal.nome_razao || nome),
      }));
      return;
    }

    const tmp = {
      id: `voalle:${cli.id}`,
      name: nome,
      nome_razao: nome,
      cpf_cnpj: cli.cpf_cnpj || cli.txIdFormated || cli.txId || "",
      cpf_cnpj_digits: onlyDigits(cli.cpf_cnpj || cli.txIdFormated || cli.txId || ""),
      city: cli.city,
      state: cli.state,
    };

    setExternalClientOption(tmp);
    setCurrentQuote((prev) => ({
      ...prev,
      client_id: String(tmp.id),
      client_name: nome,
      client_document: String(tmp.cpf_cnpj || ""),
      contactPerson: prev.contactPerson?.trim() ? prev.contactPerson : nome,
    }));
  }, [location.state, clients]);

  const handleItemsChange = (newItems) => setCurrentQuote((prev) => ({ ...prev, items: newItems }));
  const handleInputChange = (e) => setCurrentQuote((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSelectChange = (name, value) => {
    const v = String(value);
    setCurrentQuote((prev) => ({ ...prev, [name]: v }));
  };

  const productItems = useMemo(() => currentQuote.items.filter((i) => i.item_type === "PRODUTO"), [currentQuote.items]);
  const serviceItems = useMemo(() => currentQuote.items.filter((i) => i.item_type === "SERVICO"), [currentQuote.items]);
  const scmServiceItems = useMemo(() => currentQuote.items.filter((i) => i.item_type === "SERVICO_SCM"), [currentQuote.items]);

  const totais = useMemo(() => {
    const subtotalProdutos = productItems.reduce((acc, item) => acc + (item.total_price || 0), 0);
    const subtotalServicos = serviceItems.reduce((acc, item) => acc + (item.total_price || 0), 0);
    const subtotalScm = scmServiceItems.reduce((acc, item) => acc + (item.total_price || 0), 0);

    const totalTributos = currentQuote.items.reduce((acc, item) => {
      const taxes = item.taxes || {};
      return acc + (taxes.total_tributos_item || 0);
    }, 0);

    const totalGeral = subtotalProdutos + subtotalServicos + subtotalScm;
    return { subtotalProdutos, subtotalServicos, subtotalScm, totalTributos, totalGeral };
  }, [productItems, serviceItems, scmServiceItems, currentQuote.items]);

  const companiesSelectList = useMemo(() => {
    const list = Array.isArray(companies) ? [...companies] : [];
    if (externalCompanyOption && !list.some((c) => String(c.id) === String(externalCompanyOption.id))) {
      list.unshift(externalCompanyOption);
    }
    return list;
  }, [companies, externalCompanyOption]);

  const clientsSelectList = useMemo(() => {
    const list = Array.isArray(clients) ? [...clients] : [];
    if (externalClientOption && !list.some((c) => String(c.id) === String(externalClientOption.id))) {
      list.unshift(externalClientOption);
    }
    return list;
  }, [clients, externalClientOption]);

  const sellersSelectList = useMemo(() => {
    if (Array.isArray(bffSellers) && bffSellers.length > 0) return bffSellers;
    return Array.isArray(supabaseSellers) ? supabaseSellers : [];
  }, [bffSellers, supabaseSellers]);

  const pdfPreviewData = useMemo(() => {
    const company =
      (companies || []).find((c) => String(c.id) === String(currentQuote.company_id)) ||
      (externalCompanyOption ? externalCompanyOption : null);

    const clientId = String(currentQuote.client_id || "");
    const clientIdRaw = stripVoallePrefix(clientId);

    const client =
      (clients || []).find((c) => String(c.id) === clientId) ||
      (clients || []).find((c) => String(c.id) === clientIdRaw) ||
      (externalClientOption ? externalClientOption : null);

    const autor = (users || []).find((u) => String(u.id) === String(currentQuote.user_id));

    const vendedor =
      (bffSellers || []).find((u) => String(u.id) === String(currentQuote.seller_id)) ||
      (supabaseSellers || []).find((s) => String(s.id) === String(currentQuote.seller_id));

    return {
      quote: {
        ...currentQuote,
        total_geral: totais.totalGeral,
        total_tributos_estimados: totais.totalTributos,
        subtotal_produtos: totais.subtotalProdutos,
        subtotal_servicos: totais.subtotalServicos,
        subtotal_scm: totais.subtotalScm,
      },
      company: company
        ? { ...company, addresses: (addresses || []).filter((addr) => addr.company_id === company.id) }
        : null,
      client: client
        ? { ...client, addresses: (addresses || []).filter((addr) => addr.client_id === client.id) }
        : null,
      vendedor,
      autor,
    };
  }, [
    currentQuote,
    totais,
    companies,
    clients,
    users,
    addresses,
    supabaseSellers,
    bffSellers,
    externalClientOption,
    externalCompanyOption,
  ]);

  const validatePdfData = () => {
    if (!pdfPreviewData.company || !pdfPreviewData.client || !pdfPreviewData.autor || !pdfPreviewData.vendedor) {
      toast({
        variant: "destructive",
        title: "Dados incompletos",
        description: "Selecione empresa, cliente e vendedor para gerar o PDF.",
      });
      return false;
    }
    return true;
  };

  const handleGeneratePDF = async () => {
    if (!validatePdfData()) return null;
    try {
      const result = await generateQuotePDF(pdfPreviewData);
      return result || null;
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Erro ao gerar PDF",
        description: e?.message || String(e),
      });
      return null;
    }
  };

  const handlePrint = async () => {
    if (!validatePdfData()) return;
    try {
      const result = await generateQuotePDF(pdfPreviewData, { download: false });
      const url = normalizePdfResultToUrl(result);

      if (url) {
        openAndPrintUrl(url);
        return;
      }

      await handleGeneratePDF();
      toast({
        title: "PDF gerado",
        description:
          "O gerador atual baixou o PDF, mas não retornou uma URL/Blob para imprimir automático. Se quiser, eu ajusto o pdfGenerator para imprimir direto.",
      });
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Erro ao imprimir",
        description: e?.message || String(e),
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const isExternalClient = String(currentQuote.client_id || "").startsWith("voalle:");
    const isExternalCompany = String(currentQuote.company_id || "").startsWith("static:");

    if (isExternalClient) {
      toast({
        variant: "destructive",
        title: "Cliente não está no cadastro interno",
        description: "Cadastre/importe o cliente no módulo interno para salvar a cotação.",
      });
      return;
    }
    if (isExternalCompany) {
      toast({
        variant: "destructive",
        title: "Empresa emitente não cadastrada",
        description: "Cadastre a empresa emitente no módulo interno para salvar a cotação.",
      });
      return;
    }

    if (!currentQuote.company_id || !currentQuote.client_id || !currentQuote.seller_id) {
      toast({
        variant: "destructive",
        title: "Campos obrigatórios",
        description: "Empresa, Cliente e Vendedor são obrigatórios.",
      });
      return;
    }

    const quoteData = {
      ...currentQuote,
      total_value: totais.totalGeral,
      client_name: String(currentQuote.client_name || ""),
      client_document: String(currentQuote.client_document || ""),
      items: currentQuote.items.map((item) => ({
        item_id: item.source === "catalog" ? item.id : null,
        item_type: item.item_type,
        code: item.code,
        description: item.description,
        unit: item.unit,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        taxes: item.taxes || {},
      })),
    };

    try {
      await addQuote(quoteData);
      toast({
        title: id ? "Cotação atualizada!" : "Cotação criada!",
        description: "A cotação foi salva com sucesso.",
      });
      navigate("/cotacoes");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao Salvar",
        description: error.message,
      });
    }
  };

  return (
    <div className="space-y-6">
      <motion.form
        onSubmit={handleSubmit}
        className="space-y-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">
              {id ? "Editar Cotação" : "Criar Nova Cotação"}
            </h1>
            <p className="text-white/60">
              Proposta Nº: {currentQuote.proposal_number} | Revisão: {currentQuote.revision}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="btn-secondary"
              onClick={() => setIsPreviewOpen(true)}
              disabled={!currentQuote.company_id || !currentQuote.client_id}
            >
              <FileDown className="w-4 h-4 mr-2" />
              PDF (Preview)
            </Button>

            <Button
              type="button"
              variant="outline"
              className="btn-secondary"
              onClick={handleGeneratePDF}
              disabled={!currentQuote.company_id || !currentQuote.client_id}
            >
              <FileDown className="w-4 h-4 mr-2" />
              Baixar PDF
            </Button>

            <Button
              type="button"
              variant="outline"
              className="btn-secondary"
              onClick={handlePrint}
              disabled={!currentQuote.company_id || !currentQuote.client_id}
            >
              <Printer className="w-4 h-4 mr-2" />
              Imprimir
            </Button>

            <Button type="submit" className="btn-primary">
              <Save className="w-4 h-4 mr-2" />
              Salvar Cotação
            </Button>
          </div>
        </div>

        <div className="floating-card p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Empresa Emitente */}
          <div>
            <Label htmlFor="company_id">Empresa Emitente</Label>
            <Select value={String(currentQuote.company_id || "")} disabled>
              <SelectTrigger className="input-field">
                <Building className="w-4 h-4 mr-2 opacity-60" />
                <SelectValue placeholder="Empresa emitente" />
              </SelectTrigger>
              <SelectContent className="glass-effect">
                {companiesSelectList.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* ✅ Cliente com busca (sem botão +) */}
          <div>
            <Label htmlFor="client_id">Cliente</Label>
            <ClientSearchSelect
              value={String(currentQuote.client_id || "")}
              placeholder="Selecione o cliente"
              items={clientsSelectList}
              getId={(c) => String(c.id)}
              getLabel={(c) => formatClientLabel(c)}
              // ✅ inclui campos extras na busca
              getSearchText={(c) =>
                [
                  c?.cpf_cnpj_digits,
                  c?.cpf_cnpj,
                  c?.txId,
                  c?.txIdFormated,
                  c?.document,
                  c?.email,
                  c?.name,
                  c?.nome_razao,
                  c?.nome_fantasia,
                ]
                  .filter(Boolean)
                  .join(" ")
              }
              icon={<User className="w-4 h-4 opacity-60" />}
              onValueChange={(v, selected) => {
                handleSelectChange("client_id", v);

                if (selected) {
                  const selName =
                    selected.name || selected.nome_razao || selected.nome_fantasia || selected.nome || "";
                  const selDoc =
                    selected.cpf_cnpj ||
                    selected.cpfCnpj ||
                    selected.cpf_cnpj_digits ||
                    selected.txIdFormated ||
                    selected.txId ||
                    selected.document ||
                    "";

                  localStorage.setItem("cotacao_cliente", JSON.stringify(selected));

                  setCurrentQuote((prev) => ({
                    ...prev,
                    client_id: String(v),
                    client_name: String(selName || ""),
                    client_document: String(selDoc || ""),
                    contactPerson: prev.contactPerson?.trim()
                      ? prev.contactPerson
                      : String(selName || ""),
                  }));
                }
              }}
            />
          </div>

          {/* Vendedor */}
          <div>
            <Label htmlFor="seller_id">Vendedor</Label>
            <Select
              value={String(currentQuote.seller_id || "")}
              onValueChange={(v) => handleSelectChange("seller_id", v)}
            >
              <SelectTrigger className="input-field">
                <UserSquare className="w-4 h-4 mr-2 opacity-60" />
                <SelectValue placeholder="Selecione o vendedor" />
              </SelectTrigger>

              <SelectContent className="glass-effect">
                {sellersSelectList.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {(s.name || s.nome || "Vendedor")} {s.email ? `(${s.email})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Aos cuidados */}
          <div className="md:col-span-3">
            <Label htmlFor="contactPerson">Aos Cuidados de (Contato no Cliente)</Label>
            <Input
              name="contactPerson"
              value={currentQuote.contactPerson}
              onChange={handleInputChange}
              className="input-field"
              placeholder="Nome do contato principal no cliente"
            />
          </div>
        </div>

        <div className="floating-card p-6">
          <QuoteItemsManager
            items={currentQuote.items}
            onItemsChange={handleItemsChange}
            productItems={productItems}
            serviceItems={serviceItems}
            scmServiceItems={scmServiceItems}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="floating-card p-6">
            <QuoteNotes formData={currentQuote} handleInputChange={handleInputChange} />
          </div>
          <div className="floating-card p-6">
            <QuoteTotals totais={totais} />
          </div>
        </div>
      </motion.form>

      <QuotePDFPreviewDialog
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        onConfirm={handleGeneratePDF}
        previewData={pdfPreviewData}
      />
    </div>
  );
}