import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useData } from "@/contexts/SupabaseDataContext";
import { useToast } from "@/components/ui/use-toast";
import { Save, Building, FileDown, User, UserSquare, Users2 } from "lucide-react";
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
  if (!Array.isArray(quotes) || quotes.length === 0) return 1;
  const maxNumber = Math.max(...quotes.map((q) => parseInt(q?.proposal_number, 10) || 0));
  return maxNumber + 1;
};

function formatClientLabel(c) {
  const doc = c?.cpf_cnpj || c?.txIdFormated || c?.txId || c?.document || "";
  const nome = c?.name || c?.nome_razao || c?.nome || "";
  const docTxt = String(doc).trim();
  const nomeTxt = String(nome).trim();
  if (docTxt && nomeTxt) return `${docTxt} - ${nomeTxt}`;
  return nomeTxt || docTxt || "Cliente";
}

export default function QuoteFormPage() {
  const {
    clients,
    addClient, // (mantém aqui para não quebrar caso o contexto espere, mas não usamos no botão)
    quotes,
    addQuote,
    companies,
    users,
    user: supabaseUser,
    addresses,
    sellers: supabaseSellers, // fallback
  } = useData();

  // ✅ BFF user esperado: { sub, email, role, name }
  const { user: bffUser } = useAuth();

  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();

  const safeCompanies = Array.isArray(companies) ? companies : [];
  const safeClients = Array.isArray(clients) ? clients : [];
  const safeQuotes = Array.isArray(quotes) ? quotes : [];
  const safeUsers = Array.isArray(users) ? users : [];
  const safeAddresses = Array.isArray(addresses) ? addresses : [];
  const safeSupabaseSellers = Array.isArray(supabaseSellers) ? supabaseSellers : [];

  const [bffSellers, setBffSellers] = useState([]);
  const [loadingSellers, setLoadingSellers] = useState(false);

  const [externalClientOption, setExternalClientOption] = useState(null);
  const [externalCompanyOption, setExternalCompanyOption] = useState(null);

  const [currentQuote, setCurrentQuote] = useState({
    id: null,
    company_id: "",
    client_id: "",
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

  // ✅ carrega vendedores do BFF
  useEffect(() => {
    (async () => {
      try {
        setLoadingSellers(true);
        const list = await listSellers(); // SEMPRE array
        setBffSellers(list);
      } catch (e) {
        console.error("[QuoteFormPage] erro listSellers:", e);
        setBffSellers([]);
        toast({
          variant: "destructive",
          title: "Erro ao carregar vendedores",
          description: String(e?.message || e),
        });
      } finally {
        setLoadingSellers(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ init quote (proposal, user_id)
  useEffect(() => {
    const userId = supabaseUser?.id || "";

    if (id) {
      const quote = safeQuotes.find((q) => String(q?.id) === String(id));
      if (quote) {
        setCurrentQuote({
          ...quote,
          user_id: userId,
          items: Array.isArray(quote.items) ? quote.items : [],
        });
      }
      return;
    }

    setCurrentQuote((prev) => ({
      ...prev,
      proposal_number: String(getNextProposalNumber(safeQuotes)).padStart(5, "0"),
      user_id: userId,
    }));
  }, [id, safeQuotes, supabaseUser]);

  // ✅ define vendedor padrão = vendedor logado (BFF)
  useEffect(() => {
    if (id) return; // editando
    if (!bffUser?.sub) return;

    setCurrentQuote((prev) => {
      if (prev.seller_id) return prev;
      return { ...prev, seller_id: String(bffUser.sub) };
    });
  }, [bffUser, id]);

  // ✅ empresa emitente fixa
  useEffect(() => {
    if (!safeCompanies.length) return;

    const found =
      safeCompanies.find((c) => onlyDigits(c?.cnpj) === DEFAULT_COMPANY.cnpjDigits) ||
      safeCompanies.find((c) => String(c?.name || "").toLowerCase().includes("fibra onda"));

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
  }, [safeCompanies]);

  // ✅ recebe cliente selecionado
  useEffect(() => {
    const cli = location.state?.cliente || readClienteFromStorage();
    if (!cli) return;

    const docDigits = onlyDigits(cli.cpf_cnpj || cli.txIdFormated || cli.txId || "");
    const nome = cli.nome_razao || cli.name || cli.nome || "";

    const matchInternal =
      safeClients.find((c) => onlyDigits(c?.cpf_cnpj) === docDigits) ||
      safeClients.find((c) => onlyDigits(c?.txId) === docDigits);

    if (matchInternal) {
      setExternalClientOption(null);
      setCurrentQuote((prev) => ({
        ...prev,
        client_id: String(matchInternal.id),
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
      city: cli.city,
      state: cli.state,
    };

    setExternalClientOption(tmp);
    setCurrentQuote((prev) => ({
      ...prev,
      client_id: String(tmp.id),
      contactPerson: prev.contactPerson?.trim() ? prev.contactPerson : nome,
    }));
  }, [location.state, safeClients]);

  const handleItemsChange = (newItems) =>
    setCurrentQuote((prev) => ({ ...prev, items: Array.isArray(newItems) ? newItems : [] }));

  const handleInputChange = (e) =>
    setCurrentQuote((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSelectChange = (name, value) => {
    const v = String(value);
    setCurrentQuote((prev) => ({ ...prev, [name]: v }));

    if (name === "client_id") {
      const selected =
        safeClients.find((c) => String(c.id) === v) ||
        (externalClientOption && String(externalClientOption.id) === v ? externalClientOption : null);

      if (selected) {
        localStorage.setItem("cotacao_cliente", JSON.stringify(selected));
        setCurrentQuote((prev) => ({
          ...prev,
          client_id: v,
          contactPerson: prev.contactPerson?.trim()
            ? prev.contactPerson
            : (selected.name || selected.nome_razao || ""),
        }));
      }
    }
  };

  // ✅ Selecionar cliente: vai para /clientes e volta para a cotação
  const handleSelectClient = () => {
    const returnTo = `${location.pathname}${location.search || ""}`;
    navigate(`/clientes?returnTo=${encodeURIComponent(returnTo)}`);
  };

  const productItems = useMemo(
    () => (Array.isArray(currentQuote.items) ? currentQuote.items : []).filter((i) => i.item_type === "PRODUTO"),
    [currentQuote.items]
  );
  const serviceItems = useMemo(
    () => (Array.isArray(currentQuote.items) ? currentQuote.items : []).filter((i) => i.item_type === "SERVICO"),
    [currentQuote.items]
  );
  const scmServiceItems = useMemo(
    () => (Array.isArray(currentQuote.items) ? currentQuote.items : []).filter((i) => i.item_type === "SERVICO_SCM"),
    [currentQuote.items]
  );

  const totais = useMemo(() => {
    const items = Array.isArray(currentQuote.items) ? currentQuote.items : [];
    const subtotalProdutos = productItems.reduce((acc, item) => acc + (item.total_price || 0), 0);
    const subtotalServicos = serviceItems.reduce((acc, item) => acc + (item.total_price || 0), 0);
    const subtotalScm = scmServiceItems.reduce((acc, item) => acc + (item.total_price || 0), 0);

    const totalTributos = items.reduce((acc, item) => {
      const taxes = item.taxes || {};
      return acc + (taxes.total_tributos_item || 0);
    }, 0);

    const totalGeral = subtotalProdutos + subtotalServicos + subtotalScm;
    return { subtotalProdutos, subtotalServicos, subtotalScm, totalTributos, totalGeral };
  }, [productItems, serviceItems, scmServiceItems, currentQuote.items]);

  const companiesSelectList = useMemo(() => {
    const list = [...safeCompanies];
    if (externalCompanyOption && !list.some((c) => String(c.id) === String(externalCompanyOption.id))) {
      list.unshift(externalCompanyOption);
    }
    return list;
  }, [safeCompanies, externalCompanyOption]);

  const clientsSelectList = useMemo(() => {
    const list = [...safeClients];
    if (externalClientOption && !list.some((c) => String(c.id) === String(externalClientOption.id))) {
      list.unshift(externalClientOption);
    }
    return list;
  }, [safeClients, externalClientOption]);

  // ✅ vendedores: BFF primeiro; fallback supabase
  const sellersSelectList = useMemo(() => {
    if (Array.isArray(bffSellers) && bffSellers.length > 0) return bffSellers;
    return safeSupabaseSellers;
  }, [bffSellers, safeSupabaseSellers]);

  const pdfPreviewData = useMemo(() => {
    const company =
      safeCompanies.find((c) => String(c.id) === String(currentQuote.company_id)) ||
      (externalCompanyOption ? externalCompanyOption : null);

    const client =
      safeClients.find((c) => String(c.id) === String(currentQuote.client_id)) ||
      (externalClientOption ? externalClientOption : null);

    const autor = safeUsers.find((u) => String(u.id) === String(currentQuote.user_id));

    const vendedor =
      (bffSellers || []).find((u) => String(u.id) === String(currentQuote.seller_id)) ||
      (safeSupabaseSellers || []).find((s) => String(s.id) === String(currentQuote.seller_id));

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
        ? { ...company, addresses: safeAddresses.filter((addr) => addr.company_id === company.id) }
        : null,
      client: client
        ? { ...client, addresses: safeAddresses.filter((addr) => addr.client_id === client.id) }
        : null,
      vendedor,
      autor,
    };
  }, [
    currentQuote,
    totais,
    safeCompanies,
    safeClients,
    safeUsers,
    safeAddresses,
    safeSupabaseSellers,
    bffSellers,
    externalClientOption,
    externalCompanyOption,
  ]);

  // ✅ IMPORTANTE:
  // - "opções de PDF" devem aparecer dentro do QuotePDFPreviewDialog (se ele já tem isso)
  // - então o botão só precisa abrir o modal.
  const handleOpenPreview = () => {
    if (!currentQuote.client_id) {
      toast({
        variant: "destructive",
        title: "Selecione um cliente",
        description: "Escolha um cliente antes de gerar o PDF.",
      });
      return;
    }
    setIsPreviewOpen(true);
  };

  // ✅ Confirmar no modal → gera PDF
  // Aceita (template) se o seu dialog passar (Orçamento / Proposta)
  const handleGeneratePDF = (template) => {
    // não trava por autor: deixa gerar mesmo sem autor
    if (!pdfPreviewData.company || !pdfPreviewData.client) {
      toast({
        variant: "destructive",
        title: "Dados incompletos",
        description: "Selecione empresa e cliente para gerar o PDF.",
      });
      return;
    }

    generateQuotePDF({
      ...pdfPreviewData,
      template, // se o pdfGenerator aceitar, ótimo; se não aceitar, ele ignora.
    });
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
      items: (Array.isArray(currentQuote.items) ? currentQuote.items : []).map((item) => ({
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
        description: String(error?.message || error),
      });
    }
  };

  // ✅ LIBERAÇÃO DO BOTÃO:
  // não depende de company_id (pq pode demorar pra carregar),
  // só precisa ter cliente selecionado.
  const canOpenPdf = Boolean(String(currentQuote.client_id || "").trim());

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
              onClick={handleOpenPreview}
              disabled={!canOpenPdf}
              title={!canOpenPdf ? "Selecione um cliente para gerar o PDF" : "Gerar PDF"}
            >
              <FileDown className="w-4 h-4 mr-2" />
              Gerar PDF
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

          {/* Cliente */}
          <div>
            <Label htmlFor="client_id">Cliente</Label>
            <div className="flex items-center gap-2">
              <Select
                value={String(currentQuote.client_id || "")}
                onValueChange={(v) => handleSelectChange("client_id", v)}
              >
                <SelectTrigger className="input-field w-full">
                  <User className="w-4 h-4 mr-2 opacity-60" />
                  <SelectValue placeholder="Selecione o cliente" />
                </SelectTrigger>

                <SelectContent className="glass-effect">
                  {clientsSelectList.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {formatClientLabel(c)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* ✅ Troca “Novo Cliente” por “Selecionar” */}
              <Button
                type="button"
                variant="secondary"
                className="btn-secondary flex-shrink-0"
                onClick={handleSelectClient}
                title="Selecionar cliente no módulo Clientes e voltar para esta cotação"
              >
                <Users2 className="w-4 h-4 mr-2" />
                Selecionar
              </Button>
            </div>
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
                <SelectValue
                  placeholder={loadingSellers ? "Carregando vendedores..." : "Selecione o vendedor"}
                />
              </SelectTrigger>

              <SelectContent className="glass-effect">
                {sellersSelectList.map((s) => (
                  <SelectItem key={String(s.id)} value={String(s.id)}>
                    {String(s.name || s.nome || "Vendedor")} {s.email ? `(${s.email})` : ""}
                  </SelectItem>
                ))}

                {sellersSelectList.length === 0 && (
                  <div className="px-3 py-2 text-xs text-white/60">
                    Nenhum vendedor disponível.
                  </div>
                )}
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
            items={Array.isArray(currentQuote.items) ? currentQuote.items : []}
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

      {/* ✅ Modal (onde ficam as opções de modelo, se o seu dialog tiver) */}
      <QuotePDFPreviewDialog
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        onConfirm={handleGeneratePDF}
        previewData={pdfPreviewData}
      />
    </div>
  );
}