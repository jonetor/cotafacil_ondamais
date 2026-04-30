// src/pages/QuoteFormPage.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import { Save, Building, FileDown, UserSquare } from "lucide-react";
import QuoteItemsManager from "@/components/quotes/QuoteItemsManager";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import QuoteTotals from "@/components/quotes/QuoteTotals";
import { generateQuotePDF } from "@/lib/pdfGenerator";
import QuotePDFPreviewDialog from "@/components/quotes/QuotePDFPreviewDialog";
import { Input } from "@/components/ui/input";
import { listSellers } from "@/services/sellers";
import { useAuth } from "@/contexts/SupabaseAuthContext";
import { uid } from "@/lib/utils";
import ClientSearchSelectRemote from "@/components/quotes/ClientSearchSelectRemote";

const onlyDigits = (s) => String(s || "").replace(/\D/g, "");

const COMPANY_OPTIONS = [
  {
    id: "static:14429925000167",
    name: "FIBRA ONDA MAIS LTDA",
    razao_social: "FIBRA ONDA MAIS LTDA",
    nome_fantasia: "FIBRA ONDA MAIS",
    cnpj: "14.429.925/0001-67",
    cnpjDigits: "14429925000167",
    ie: "15350790-0",
    endereco: "AV DAS NAÇÕES 2235 - CENTRO",
    cep: "CEP 68390-000",
    site: "www.ondamais.ai",
    email: "contato@ondamais.ai",
    fone: "0800 042 0900",
  },
  {
    id: "static:46322439000131",
    name: "ONDA MAIS TECNOLOGIA",
    razao_social: "ONDA MAIS TECNOLOGIA LTDA",
    nome_fantasia: "ONDA MAIS TECNOLOGIA",
    cnpj: "46.322.439/0001-31",
    cnpjDigits: "46322439000131",
  },
  {
    id: "static:44618753000130",
    name: "S & A INVEST",
    razao_social: "S & A INVEST LTDA",
    nome_fantasia: "S & A INVEST",
    cnpj: "44.618.753/0001-30",
    cnpjDigits: "44618753000130",
  },
];

const DEFAULT_COMPANY = COMPANY_OPTIONS[0];
const DEFAULT_COMPANY_ID = DEFAULT_COMPANY.id;

const getNextProposalNumber = (quotes) => {
  if (!Array.isArray(quotes) || quotes.length === 0) return 1;
  const maxNumber = Math.max(
    ...quotes.map((q) => parseInt(q?.proposal_number, 10) || 0)
  );
  return maxNumber + 1;
};

function safeText(v) {
  return v === 0 ? "0" : v ? String(v) : "";
}

function n(v) {
  const x = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(x) ? x : 0;
}

function normalizeItems(items) {
  const list = Array.isArray(items) ? items : [];
  return list.map((it) => {
    const quantity = n(it.quantity);
    const unit_price = n(it.unit_price);
    const item_type = String(
      it.item_type || it.type || it.itemType || "PRODUTO"
    ).toUpperCase();
    const icms = n(it.icms ?? it?.taxes?.icms);
    const issqn = n(it.issqn ?? it?.taxes?.issqn);
    const total_price = n(it.total_price) || quantity * unit_price;

    return {
      ...it,
      uid: it.uid || it.id || uid(),
      item_type: item_type === "SERVICE" ? "SERVICO" : item_type,
      source: it.source || (it.product_id ? "catalog" : "manual"),
      product_id: it.product_id || null,
      code: it.code || it.cod || it.codigo || "",
      description: it.description || it.descricao || "",
      unit: it.unit || "un",
      quantity,
      unit_price,
      total_price,
      icms,
      issqn,
      taxes: { ...(it.taxes || {}), icms, issqn },
    };
  });
}

function findCompanyById(id) {
  const sid = String(id || "");
  return COMPANY_OPTIONS.find((c) => String(c.id) === sid) || null;
}

function getClientName(client) {
  return String(
    client?.name ||
      client?.nome_razao ||
      client?.nome ||
      client?.nome_fantasia ||
      ""
  );
}

function resolveClientFromSources({
  rawClientId,
  rawClientName,
  rawClientDoc,
  safeClients,
}) {
  const id = String(rawClientId || "").trim();
  const docDigits = onlyDigits(rawClientDoc || "");
  const nameNorm = String(rawClientName || "").trim().toLowerCase();

  let found =
    safeClients.find((c) => String(c?.id || "") === id) ||
    safeClients.find((c) => onlyDigits(c?.cpf_cnpj) === docDigits) ||
    safeClients.find((c) => onlyDigits(c?.txId) === docDigits);

  if (!found && nameNorm) {
    found = safeClients.find((c) => {
      const n1 = String(c?.name || "").trim().toLowerCase();
      const n2 = String(c?.nome_razao || "").trim().toLowerCase();
      const n3 = String(c?.nome || "").trim().toLowerCase();
      const n4 = String(c?.nome_fantasia || "").trim().toLowerCase();
      return [n1, n2, n3, n4].includes(nameNorm);
    });
  }

  return found || null;
}

export default function QuoteFormPage() {
  const {
    clients,
    quotes,
    addQuote,
    updateQuote,
    users,
    addresses,
    sellers: supabaseSellers,
  } = useData();

  const { user: bffUser } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();

  const safeClients = Array.isArray(clients) ? clients : [];
  const safeQuotes = Array.isArray(quotes) ? quotes : [];
  const safeUsers = Array.isArray(users) ? users : [];
  const safeAddresses = Array.isArray(addresses) ? addresses : [];
  const safeSupabaseSellers = Array.isArray(supabaseSellers)
    ? supabaseSellers
    : [];

  const [bffSellers, setBffSellers] = useState([]);
  const [loadingSellers, setLoadingSellers] = useState(false);
  const [externalClientOption, setExternalClientOption] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);

  const loggedUserId = String(bffUser?.id || bffUser?.sub || "").trim();
  const loggedUserRole = String(
    bffUser?.role || bffUser?.user_metadata?.role || ""
  ).toLowerCase();
  const isSeller = loggedUserRole === "seller";

  const [currentQuote, setCurrentQuote] = useState({
    id: null,
    company_id: DEFAULT_COMPANY_ID,
    client_id: "",
    seller_id: "",
    items: [],
    status: "pending",
    validity_date: "",
    payment_terms: "",
    freight_type: "CIF",
    delivery_location: "",
    description: "",
    additional_info: "",
    contactPerson: "",
    proposal_number: "",
    revision: 0,
    created_at: new Date().toISOString(),
    user_id: "",

    forma_pagamento: "",
    validade_proposta: "",
    observacoes: "",
    objeto: "",
    missao: "",
    escopo_tecnico: "",
    segmentacao: "",
    investimento_texto: "",
    condicoes_comerciais: "",
    assinatura_tecnica: "",
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

  const resultToUrl = (result) => {
    if (!result) return null;
    if (typeof result === "string") return result;
    if (result?.url && typeof result.url === "string") return result.url;
    const blob =
      result?.blob instanceof Blob ? result.blob : result instanceof Blob ? result : null;
    if (blob) return URL.createObjectURL(blob);
    return null;
  };

  useEffect(() => {
    (async () => {
      try {
        setLoadingSellers(true);
        const list = await listSellers();
        setBffSellers(Array.isArray(list) ? list : []);
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
  }, [toast]);

  const applySelectedClient = useCallback(
    (client) => {
      if (!client) return;

      const rawId = client?.id ? String(client.id) : "";
      const docDigits = onlyDigits(
        client?.cpf_cnpj || client?.txIdFormated || client?.txId || client?.document || ""
      );
      const nome = getClientName(client);

      const matchInternal =
        safeClients.find((c) => String(c?.id) === rawId) ||
        safeClients.find((c) => onlyDigits(c?.cpf_cnpj) === docDigits) ||
        safeClients.find((c) => onlyDigits(c?.txId) === docDigits);

      if (matchInternal) {
        setExternalClientOption(null);
        setSelectedClient(matchInternal);
        setCurrentQuote((prev) => ({
          ...prev,
          client_id: String(matchInternal.id),
          contactPerson: prev.contactPerson?.trim()
            ? prev.contactPerson
            : getClientName(matchInternal),
        }));
        return;
      }

      const tmp = {
        id: rawId ? `voalle:${rawId}` : `voalle:${docDigits || uid()}`,
        name: nome,
        nome_razao: nome,
        cpf_cnpj:
          client?.cpf_cnpj ||
          client?.txIdFormated ||
          client?.txId ||
          client?.document ||
          "",
        city: client?.city || "",
        state: client?.state || "",
        email: client?.email || "",
        telefone: client?.telefone || "",
      };

      setExternalClientOption(tmp);
      setSelectedClient(tmp);
      setCurrentQuote((prev) => ({
        ...prev,
        client_id: String(tmp.id),
        contactPerson: prev.contactPerson?.trim() ? prev.contactPerson : nome,
      }));
    },
    [safeClients]
  );

  useEffect(() => {
    async function loadEditQuote() {
      if (!id) return;

      const preload = location.state?.quote;
      const sourceQuote =
        preload || safeQuotes.find((q) => String(q?.id) === String(id));

      if (!sourceQuote) return;

      const resolvedClient = resolveClientFromSources({
        rawClientId: sourceQuote.client_id,
        rawClientName: sourceQuote.client_name,
        rawClientDoc: sourceQuote.client_document,
        safeClients,
      });

      const fallbackExternal =
        !resolvedClient && (sourceQuote.client_name || sourceQuote.client_document)
          ? {
              id: String(sourceQuote.client_id || `legacy:${uid()}`),
              name: safeText(sourceQuote.client_name),
              nome_razao: safeText(sourceQuote.client_name),
              cpf_cnpj: safeText(sourceQuote.client_document),
            }
          : null;

      if (resolvedClient) {
        setSelectedClient(resolvedClient);
        setExternalClientOption(null);
      } else if (fallbackExternal) {
        setSelectedClient(fallbackExternal);
        setExternalClientOption(fallbackExternal);
      } else {
        setSelectedClient(null);
        setExternalClientOption(null);
      }

      setCurrentQuote((prev) => ({
        ...prev,
        ...sourceQuote,
        user_id: safeText(sourceQuote.user_id || loggedUserId),
        seller_id: safeText(sourceQuote.seller_id || loggedUserId),
        items: normalizeItems(sourceQuote.items),
        company_id: String(sourceQuote.company_id || DEFAULT_COMPANY_ID),
        client_id: String(
          resolvedClient?.id ||
            fallbackExternal?.id ||
            sourceQuote.client_id ||
            ""
        ),
        validity_date: safeText(sourceQuote.validity_date),
        payment_terms: safeText(sourceQuote.payment_terms),
        freight_type: safeText(sourceQuote.freight_type) || "CIF",
        delivery_location: safeText(sourceQuote.delivery_location),
        description: safeText(sourceQuote.description || sourceQuote.notes || ""),
        additional_info: safeText(
          sourceQuote.additional_info || sourceQuote.additionalInfo || ""
        ),
        contactPerson: safeText(
          sourceQuote.contact_person ||
            sourceQuote.contactPerson ||
            prev.contactPerson
        ),

        forma_pagamento: safeText(sourceQuote.forma_pagamento),
        validade_proposta: safeText(sourceQuote.validade_proposta),
        observacoes: safeText(sourceQuote.observacoes),
        objeto: safeText(sourceQuote.objeto),
        missao: safeText(sourceQuote.missao),
        escopo_tecnico: safeText(sourceQuote.escopo_tecnico),
        segmentacao: safeText(sourceQuote.segmentacao),
        investimento_texto: safeText(sourceQuote.investimento_texto),
        condicoes_comerciais: safeText(sourceQuote.condicoes_comerciais),
        assinatura_tecnica: safeText(sourceQuote.assinatura_tecnica),
      }));
    }

    if (!id) {
      setCurrentQuote((prev) => ({
        ...prev,
        proposal_number: String(getNextProposalNumber(safeQuotes)).padStart(5, "0"),
        user_id: loggedUserId,
        seller_id: prev.seller_id || loggedUserId,
        company_id: String(prev.company_id || DEFAULT_COMPANY_ID),
        client_id: "",
        contactPerson: "",
      }));
      setSelectedClient(null);
      setExternalClientOption(null);
      return;
    }

    loadEditQuote();
  }, [id, location.state, safeQuotes, loggedUserId, safeClients]);

  useEffect(() => {
    if (!loggedUserId) return;

    setCurrentQuote((prev) => {
      if (prev.seller_id) return prev;
      return {
        ...prev,
        seller_id: loggedUserId,
        user_id: prev.user_id || loggedUserId,
      };
    });
  }, [loggedUserId]);

  useEffect(() => {
    if (id) return;

    const cli = location.state?.cliente;
    if (!cli) return;

    applySelectedClient(cli);
    navigate(location.pathname, { replace: true, state: {} });
  }, [id, location.state?.cliente, navigate, location.pathname, applySelectedClient]);

  const handleItemsChange = (newItems) =>
    setCurrentQuote((prev) => ({ ...prev, items: normalizeItems(newItems) }));

  const handleInputChange = (e) =>
    setCurrentQuote((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSelectChange = (name, value) => {
    const v = String(value);
    setCurrentQuote((prev) => ({ ...prev, [name]: v }));
  };

  const handleSelectCompany = (companyId) => {
    const c = findCompanyById(companyId);
    if (!c) return;
    setCurrentQuote((prev) => ({ ...prev, company_id: String(c.id) }));
  };

  const productItems = useMemo(
    () => (currentQuote.items || []).filter((i) => i.item_type === "PRODUTO"),
    [currentQuote.items]
  );

  const serviceItems = useMemo(
    () => (currentQuote.items || []).filter((i) => i.item_type === "SERVICO"),
    [currentQuote.items]
  );

  const scmServiceItems = useMemo(
    () => (currentQuote.items || []).filter((i) => i.item_type === "SERVICO_SCM"),
    [currentQuote.items]
  );

  const totais = useMemo(() => {
    const items = Array.isArray(currentQuote.items) ? currentQuote.items : [];
    const subtotalProdutos = productItems.reduce(
      (acc, item) => acc + (item.total_price || 0),
      0
    );
    const subtotalServicos = serviceItems.reduce(
      (acc, item) => acc + (item.total_price || 0),
      0
    );
    const subtotalScm = scmServiceItems.reduce(
      (acc, item) => acc + (item.total_price || 0),
      0
    );
    const totalTributos = items.reduce(
      (acc, item) => acc + n(item?.taxes?.total_tributos_item || 0),
      0
    );
    const totalGeral = subtotalProdutos + subtotalServicos + subtotalScm;
    return {
      subtotalProdutos,
      subtotalServicos,
      subtotalScm,
      totalTributos,
      totalGeral,
    };
  }, [productItems, serviceItems, scmServiceItems, currentQuote.items]);

  const sellersSelectList = useMemo(() => {
    if (Array.isArray(bffSellers) && bffSellers.length > 0) return bffSellers;
    return safeSupabaseSellers;
  }, [bffSellers, safeSupabaseSellers]);

  const selectedCompany = useMemo(
    () => findCompanyById(currentQuote.company_id) || DEFAULT_COMPANY,
    [currentQuote.company_id]
  );

  const pdfPreviewData = useMemo(() => {
    const client =
      safeClients.find((c) => String(c.id) === String(currentQuote.client_id)) ||
      externalClientOption ||
      selectedClient ||
      null;

    const autor = safeUsers.find((u) => String(u.id) === String(currentQuote.user_id));
    const vendedor =
      (bffSellers || []).find((u) => String(u.id) === String(currentQuote.seller_id)) ||
      (safeSupabaseSellers || []).find(
        (s) => String(s.id) === String(currentQuote.seller_id)
      );

    return {
      quote: {
        ...currentQuote,
        total_geral: totais.totalGeral,
        total_tributos_estimados: totais.totalTributos,
        subtotal_produtos: totais.subtotalProdutos,
        subtotal_servicos: totais.subtotalServicos,
        subtotal_scm: totais.subtotalScm,
        description: safeText(currentQuote.description),
        additional_info: safeText(currentQuote.additional_info),
        notes: safeText(currentQuote.description),
      },
      company: { ...selectedCompany },
      client: client
        ? {
            ...client,
            addresses: safeAddresses.filter((addr) => addr.client_id === client.id),
          }
        : null,
      vendedor,
      autor,
    };
  }, [
    currentQuote,
    totais,
    selectedCompany,
    safeClients,
    externalClientOption,
    selectedClient,
    safeAddresses,
    safeUsers,
    bffSellers,
    safeSupabaseSellers,
  ]);

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

  const handlePdfConfirm = async (template, meta) => {
    const action = meta?.action || "download";
    const documentType = meta?.documentType || "orcamento";

    try {
      if (action === "print") {
        const result = await generateQuotePDF(
          { ...pdfPreviewData, template, documentType },
          { download: false }
        );
        const url = resultToUrl(result);
        if (url) {
          openAndPrintUrl(url);
          return;
        }
        toast({
          variant: "destructive",
          title: "Impressão",
          description: "PDF não retornou URL/Blob para impressão.",
        });
        return;
      }

      await generateQuotePDF({
        ...pdfPreviewData,
        template,
        documentType,
      });
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Erro ao gerar PDF",
        description: e?.message || String(e),
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const fallbackLoggedId = String(bffUser?.id || bffUser?.sub || "").trim();

    const fixedCompanyId = String(currentQuote.company_id || DEFAULT_COMPANY_ID);
    const fixedSellerId = String(currentQuote.seller_id || fallbackLoggedId || "").trim();
    const fixedClientId = String(currentQuote.client_id || "").trim();

    const missing = [];
    if (!fixedCompanyId) missing.push("Empresa");
    if (!fixedClientId) missing.push("Cliente");
    if (!fixedSellerId) missing.push("Vendedor");

    if (missing.length) {
      toast({
        variant: "destructive",
        title: "Campos obrigatórios",
        description: `Faltando: ${missing.join(", ")}.`,
      });
      return;
    }

    const c = findCompanyById(fixedCompanyId) || DEFAULT_COMPANY;

    const clientName =
      safeClients.find((cli) => String(cli.id) === fixedClientId)?.name ||
      safeClients.find((cli) => String(cli.id) === fixedClientId)?.nome_razao ||
      safeText(
        selectedClient?.name ||
          selectedClient?.nome_razao ||
          externalClientOption?.name ||
          externalClientOption?.nome_razao ||
          ""
      );

    const clientDoc =
      safeClients.find((cli) => String(cli.id) === fixedClientId)?.cpf_cnpj ||
      safeClients.find((cli) => String(cli.id) === fixedClientId)?.txIdFormated ||
      safeText(
        selectedClient?.cpf_cnpj ||
          selectedClient?.txIdFormated ||
          selectedClient?.txId ||
          externalClientOption?.cpf_cnpj ||
          externalClientOption?.txIdFormated ||
          externalClientOption?.txId ||
          ""
      );

    const quotePayload = {
      id: currentQuote.id || undefined,
      proposal_number: safeText(currentQuote.proposal_number),
      revision: Number(currentQuote.revision || 0),
      status: safeText(currentQuote.status || "pending"),
      created_at: currentQuote.created_at || Date.now(),
      updated_at: Date.now(),

      user_id: safeText(currentQuote.user_id || fallbackLoggedId),
      seller_id: fixedSellerId,

      company_id: fixedCompanyId,
      company_name: safeText(c.name),
      company_document: safeText(c.cnpj),

      client_id: fixedClientId,
      client_name: safeText(clientName),
      client_document: safeText(clientDoc),

      contact_person: safeText(currentQuote.contactPerson),
      validity_date: safeText(currentQuote.validity_date),
      payment_terms: safeText(currentQuote.payment_terms),
      freight_type: safeText(currentQuote.freight_type),
      delivery_location: safeText(currentQuote.delivery_location),
      notes: safeText(currentQuote.description),
      additional_info: safeText(currentQuote.additional_info),

      forma_pagamento: safeText(currentQuote.forma_pagamento),
      validade_proposta: safeText(currentQuote.validade_proposta),
      observacoes: safeText(currentQuote.observacoes),
      objeto: safeText(currentQuote.objeto),
      missao: safeText(currentQuote.missao),
      escopo_tecnico: safeText(currentQuote.escopo_tecnico),
      segmentacao: safeText(currentQuote.segmentacao),
      investimento_texto: safeText(currentQuote.investimento_texto),
      condicoes_comerciais: safeText(currentQuote.condicoes_comerciais),
      assinatura_tecnica: safeText(currentQuote.assinatura_tecnica),

      total_value: Number(totais.totalGeral || 0),

      items: normalizeItems(currentQuote.items).map((item) => ({
        id: item.id || undefined,
        product_id: item.product_id || null,
        item_type: item.item_type || "PRODUTO",
        code: item.code,
        description: item.description,
        unit: item.unit,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        icms: n(item.icms ?? item?.taxes?.icms),
        issqn: n(item.issqn ?? item?.taxes?.issqn),
        taxes: item.taxes || {},
      })),
    };

    try {
      let saved;

      if (currentQuote.id && typeof updateQuote === "function") {
        saved = await updateQuote(currentQuote.id, quotePayload);
      } else {
        saved = await addQuote(quotePayload);
      }

      toast({
        title: currentQuote.id ? "Cotação atualizada!" : "Cotação criada!",
        description: "A cotação foi salva com sucesso.",
      });

      if (saved?.id && !currentQuote.id) {
        setCurrentQuote((prev) => ({ ...prev, id: saved.id }));
      }

      navigate("/cotacoes");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao Salvar",
        description: String(error?.message || error),
      });
    }
  };

  const canOpenPdf = Boolean(String(currentQuote.client_id || "").trim());
  const canSave =
    Boolean(String(currentQuote.company_id || DEFAULT_COMPANY_ID).trim()) &&
    Boolean(String(currentQuote.client_id || "").trim()) &&
    Boolean(String(currentQuote.seller_id || loggedUserId || "").trim());

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
            >
              <FileDown className="w-4 h-4 mr-2" />
              Gerar PDF
            </Button>

            <Button type="submit" className="btn-primary" disabled={!canSave}>
              <Save className="w-4 h-4 mr-2" />
              Salvar Cotação
            </Button>
          </div>
        </div>

        <div className="floating-card p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <Label htmlFor="company_id">Empresa Emitente</Label>
            <Select
              value={String(currentQuote.company_id || "")}
              onValueChange={handleSelectCompany}
            >
              <SelectTrigger className="input-field">
                <Building className="w-4 h-4 mr-2 opacity-60" />
                <SelectValue>
                  {(() => {
                    const empresa = COMPANY_OPTIONS.find(
                      (c) => String(c.id) === String(currentQuote.company_id || "")
                    );
                    return empresa
                      ? `${empresa.name} (${empresa.cnpj})`.toUpperCase()
                      : "SELECIONE A EMPRESA";
                  })()}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="glass-effect">
                {COMPANY_OPTIONS.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {`${c.name} (${c.cnpj})`.toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Cliente</Label>
            <ClientSearchSelectRemote
              value={selectedClient}
              onChange={(client) => applySelectedClient(client)}
              placeholder="Pesquisar cliente"
              className="w-full"
            />
          </div>

          <div>
            <Label htmlFor="seller_id">Vendedor</Label>
            <Select
              value={String(currentQuote.seller_id || "")}
              onValueChange={(v) => handleSelectChange("seller_id", v)}
              disabled={isSeller}
            >
              <SelectTrigger className="input-field">
                <UserSquare className="w-4 h-4 mr-2 opacity-60" />
                <SelectValue
                  placeholder={
                    loadingSellers
                      ? "Carregando vendedores..."
                      : "Selecione o vendedor"
                  }
                />
              </SelectTrigger>

              <SelectContent className="glass-effect">
                {sellersSelectList.map((s) => (
                  <SelectItem key={String(s.id)} value={String(s.id)}>
                    {String(s.name || s.nome || "Vendedor")}
                    {s.email ? ` (${s.email})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-3">
            <Label htmlFor="contactPerson">Aos Cuidados de (Contato no Cliente)</Label>
            <Input
              name="contactPerson"
              value={currentQuote.contactPerson}
              onChange={handleInputChange}
              className="input-field"
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

        <div className="floating-card p-6">
          <Label htmlFor="description">Descrição da Cotação</Label>
          <textarea
            name="description"
            value={currentQuote.description}
            onChange={handleInputChange}
            className="input-field min-h-[110px] w-full resize-none"
            placeholder="Ex: Proposta para instalação + materiais; condições especiais..."
          />
        </div>

        <div className="floating-card p-6">
          <Label htmlFor="additional_info">Informações adicionais</Label>
          <textarea
            name="additional_info"
            value={currentQuote.additional_info}
            onChange={handleInputChange}
            className="input-field min-h-[110px] w-full resize-none"
            placeholder="Ex: Prazo, garantias, detalhes técnicos..."
          />
        </div>

        <div className="floating-card p-6 space-y-4">
          <h3 className="text-lg font-semibold text-white">
            Campos da Proposta Comercial
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="forma_pagamento">Forma de pagamento</Label>
              <Input
                name="forma_pagamento"
                value={currentQuote.forma_pagamento}
                onChange={handleInputChange}
                className="input-field"
              />
            </div>

            <div>
              <Label htmlFor="validade_proposta">Validade da proposta</Label>
              <Input
                name="validade_proposta"
                value={currentQuote.validade_proposta}
                onChange={handleInputChange}
                className="input-field"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="objeto">Objeto</Label>
            <textarea
              name="objeto"
              value={currentQuote.objeto}
              onChange={handleInputChange}
              className="input-field min-h-[90px] w-full resize-none"
            />
          </div>

          <div>
            <Label htmlFor="missao">Missão</Label>
            <textarea
              name="missao"
              value={currentQuote.missao}
              onChange={handleInputChange}
              className="input-field min-h-[90px] w-full resize-none"
            />
          </div>

          <div>
            <Label htmlFor="escopo_tecnico">Escopo técnico</Label>
            <textarea
              name="escopo_tecnico"
              value={currentQuote.escopo_tecnico}
              onChange={handleInputChange}
              className="input-field min-h-[120px] w-full resize-none"
            />
          </div>

          <div>
            <Label htmlFor="segmentacao">Segmentação</Label>
            <textarea
              name="segmentacao"
              value={currentQuote.segmentacao}
              onChange={handleInputChange}
              className="input-field min-h-[100px] w-full resize-none"
            />
          </div>

          <div>
            <Label htmlFor="investimento_texto">Investimento</Label>
            <textarea
              name="investimento_texto"
              value={currentQuote.investimento_texto}
              onChange={handleInputChange}
              className="input-field min-h-[100px] w-full resize-none"
            />
          </div>

          <div>
            <Label htmlFor="condicoes_comerciais">Condições comerciais</Label>
            <textarea
              name="condicoes_comerciais"
              value={currentQuote.condicoes_comerciais}
              onChange={handleInputChange}
              className="input-field min-h-[100px] w-full resize-none"
            />
          </div>

          <div>
            <Label htmlFor="assinatura_tecnica">Assinatura técnica</Label>
            <Input
              name="assinatura_tecnica"
              value={currentQuote.assinatura_tecnica}
              onChange={handleInputChange}
              className="input-field"
            />
          </div>

          <div>
            <Label htmlFor="observacoes">Observações</Label>
            <textarea
              name="observacoes"
              value={currentQuote.observacoes}
              onChange={handleInputChange}
              className="input-field min-h-[90px] w-full resize-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="floating-card p-6">
            <QuoteTotals totais={totais} />
          </div>

          <div className="floating-card p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="validity_date">Validade (dias)</Label>
                <Input
                  name="validity_date"
                  value={currentQuote.validity_date}
                  onChange={handleInputChange}
                  className="input-field"
                />
              </div>

              <div>
                <Label htmlFor="payment_terms">Condições de pagamento</Label>
                <Input
                  name="payment_terms"
                  value={currentQuote.payment_terms}
                  onChange={handleInputChange}
                  className="input-field"
                />
              </div>

              <div>
                <Label htmlFor="freight_type">Tipo de frete</Label>
                <Input
                  name="freight_type"
                  value={currentQuote.freight_type}
                  onChange={handleInputChange}
                  className="input-field"
                />
              </div>

              <div>
                <Label htmlFor="delivery_location">Local de entrega</Label>
                <Input
                  name="delivery_location"
                  value={currentQuote.delivery_location}
                  onChange={handleInputChange}
                  className="input-field"
                />
              </div>
            </div>
          </div>
        </div>
      </motion.form>

      <QuotePDFPreviewDialog
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        previewData={pdfPreviewData}
        onConfirm={handlePdfConfirm}
      />
    </div>
  );
}