// src/pages/QuoteFormPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useData } from "@/contexts/SupabaseDataContext";
import { useToast } from "@/components/ui/use-toast";
import { Save, Building, FileDown, User, UserSquare, Users2 } from "lucide-react";
import QuoteItemsManager from "@/components/quotes/QuoteItemsManager";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import QuoteTotals from "@/components/quotes/QuoteTotals";
import { generateQuotePDF } from "@/lib/pdfGenerator";
import QuotePDFPreviewDialog from "@/components/quotes/QuotePDFPreviewDialog";
import { Input } from "@/components/ui/input";
import { listSellers } from "@/services/sellers";
import { useAuth } from "@/contexts/SupabaseAuthContext";
import { uid } from "@/lib/utils"; // ✅ garante uid nos itens

const onlyDigits = (s) => String(s || "").replace(/\D/g, "");

const DEFAULT_COMPANY = {
  name: "Fibra Onda+ LTDA",
  razao_social: "Fibra Onda Mais LTDA",
  nome_fantasia: "Fibra Onda Mais",
  cnpj: "14.429.925/0001-67",
  cnpjDigits: "14429925000167",
};

const DEFAULT_COMPANY_ID = `static:${DEFAULT_COMPANY.cnpjDigits}`;

const readClienteFromStorage = () => {
  try {
    return JSON.parse(localStorage.getItem("cotacao_cliente") || "null");
  } catch {
    return null;
  }
};

const clearClienteFromStorage = () => {
  try {
    localStorage.removeItem("cotacao_cliente");
  } catch {}
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

function safeText(v) {
  return v === 0 ? "0" : v ? String(v) : "";
}

function n(v) {
  const x = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(x) ? x : 0;
}

/**
 * ✅ NORMALIZA ITENS do BFF para o formato que seu QuoteItemsManager/ItemTable esperam
 * - garante uid
 * - garante item_type (sem isso suas tabelas ficam vazias!)
 * - garante taxes {icms, issqn}
 * - garante números
 */
function normalizeItems(items) {
  const list = Array.isArray(items) ? items : [];
  return list.map((it) => {
    const quantity = n(it.quantity);
    const unit_price = n(it.unit_price);

    // item_type pode não existir no banco -> default PRODUTO
    const item_type = String(it.item_type || it.type || it.itemType || "PRODUTO").toUpperCase();

    // taxes pode vir em it.taxes (front) ou icms/issqn (banco)
    const icms = n(it.icms ?? it?.taxes?.icms);
    const issqn = n(it.issqn ?? it?.taxes?.issqn);

    const total_price =
      n(it.total_price) || quantity * unit_price;

    return {
      ...it,
      uid: it.uid || it.id || uid(),
      item_type: item_type === "SERVICE" ? "SERVICO" : item_type, // compat
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

      taxes: {
        ...(it.taxes || {}),
        icms,
        issqn,
      },
    };
  });
}

export default function QuoteFormPage() {
  const { clients, quotes, addQuote, companies, users, user: supabaseUser, addresses, sellers: supabaseSellers } =
    useData();

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

  const [externalCompanyOption, setExternalCompanyOption] = useState({
    id: DEFAULT_COMPANY_ID,
    name: `${DEFAULT_COMPANY.name} (${DEFAULT_COMPANY.cnpj})`,
    cnpj: DEFAULT_COMPANY.cnpj,
    razao_social: DEFAULT_COMPANY.razao_social,
    nome_fantasia: DEFAULT_COMPANY.nome_fantasia,
    addresses: [],
  });

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
    notes: "",

    contactPerson: "",

    proposal_number: "",
    revision: 0,
    created_at: new Date().toISOString(),
    user_id: "",
  });

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

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

  const normalizePdfResultToUrl = (result) => {
    if (!result) return null;
    if (typeof result === "string") return result;
    if (result?.url && typeof result.url === "string") return result.url;

    const blob = result?.blob instanceof Blob ? result.blob : result instanceof Blob ? result : null;
    if (blob) return URL.createObjectURL(blob);
    return null;
  };

  // LOAD SELLERS
  useEffect(() => {
    (async () => {
      try {
        setLoadingSellers(true);
        const list = await listSellers();
        setBffSellers(Array.isArray(list) ? list : []);
      } catch (e) {
        console.error("[QuoteFormPage] erro listSellers:", e);
        setBffSellers([]);
        toast({ variant: "destructive", title: "Erro ao carregar vendedores", description: String(e?.message || e) });
      } finally {
        setLoadingSellers(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ INIT QUOTE (corrigido: preload -> GET /api/quotes/:id -> fallback safeQuotes)
  useEffect(() => {
    const userId = supabaseUser?.id || "";

    async function loadEditQuote() {
      if (!id) return;

      try {
        // 1) veio da lista (navigate com state.quote)
        const preload = location.state?.quote;
        if (preload) {
          setCurrentQuote((prev) => ({
            ...prev,
            ...preload,
            user_id: userId,
            items: normalizeItems(preload.items),
            company_id: String(preload.company_id || DEFAULT_COMPANY_ID),

            validity_date: safeText(preload.validity_date),
            payment_terms: safeText(preload.payment_terms),
            freight_type: safeText(preload.freight_type) || "CIF",
            delivery_location: safeText(preload.delivery_location),
            notes: safeText(preload.notes),

            contactPerson: safeText(preload.contact_person || preload.contactPerson || prev.contactPerson),
          }));
          return;
        }

        // 2) fallback: busca no backend (cotação completa com itens)
        const resp = await fetch(`/api/quotes/${id}`);
        if (resp.ok) {
          const data = await resp.json();
          setCurrentQuote((prev) => ({
            ...prev,
            ...data,
            user_id: userId,
            items: normalizeItems(data.items),
            company_id: String(data.company_id || DEFAULT_COMPANY_ID),

            validity_date: safeText(data.validity_date),
            payment_terms: safeText(data.payment_terms),
            freight_type: safeText(data.freight_type) || "CIF",
            delivery_location: safeText(data.delivery_location),
            notes: safeText(data.notes),

            contactPerson: safeText(data.contact_person || data.contactPerson || prev.contactPerson),
          }));
          return;
        }

        // 3) fallback antigo (lista local do contexto)
        const quote = safeQuotes.find((q) => String(q?.id) === String(id));
        if (quote) {
          setCurrentQuote((prev) => ({
            ...prev,
            ...quote,
            user_id: userId,
            items: normalizeItems(quote.items),
            company_id: String(quote.company_id || DEFAULT_COMPANY_ID),

            validity_date: safeText(quote.validity_date),
            payment_terms: safeText(quote.payment_terms),
            freight_type: safeText(quote.freight_type) || "CIF",
            delivery_location: safeText(quote.delivery_location),
            notes: safeText(quote.notes),

            contactPerson: safeText(quote.contact_person || quote.contactPerson || prev.contactPerson),
          }));
        }
      } catch (e) {
        console.error("Erro ao carregar cotação:", e);
        toast({
          variant: "destructive",
          title: "Erro ao carregar cotação",
          description: String(e?.message || e),
        });
      }
    }

    // modo criar
    if (!id) {
      setCurrentQuote((prev) => ({
        ...prev,
        proposal_number: String(getNextProposalNumber(safeQuotes)).padStart(5, "0"),
        user_id: userId,
        company_id: String(prev.company_id || DEFAULT_COMPANY_ID),
      }));
      return;
    }

    // modo editar
    loadEditQuote();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, supabaseUser, location.state, safeQuotes]);

  // SELLER DEFAULT = LOGADO
  useEffect(() => {
    if (id) return;
    if (!bffUser?.sub) return;

    setCurrentQuote((prev) => {
      if (prev.seller_id) return prev;
      return { ...prev, seller_id: String(bffUser.sub) };
    });
  }, [bffUser, id]);

  // EMPRESA FIXA (fallback)
  useEffect(() => {
    if (!safeCompanies.length) {
      setCurrentQuote((prev) => ({ ...prev, company_id: String(prev.company_id || DEFAULT_COMPANY_ID) }));
      return;
    }

    const found =
      safeCompanies.find((c) => onlyDigits(c?.cnpj) === DEFAULT_COMPANY.cnpjDigits) ||
      safeCompanies.find((c) => String(c?.name || "").toLowerCase().includes("fibra onda"));

    if (found) {
      setExternalCompanyOption(null);
      setCurrentQuote((prev) => ({ ...prev, company_id: String(found.id) }));
    } else {
      const tmp = {
        id: DEFAULT_COMPANY_ID,
        name: `${DEFAULT_COMPANY.name} (${DEFAULT_COMPANY.cnpj})`,
        cnpj: DEFAULT_COMPANY.cnpj,
        razao_social: DEFAULT_COMPANY.razao_social,
        nome_fantasia: DEFAULT_COMPANY.nome_fantasia,
        addresses: [],
      };
      setExternalCompanyOption(tmp);
      setCurrentQuote((prev) => ({ ...prev, company_id: String(tmp.id) }));
    }
  }, [safeCompanies]);

  // RECEBER CLIENTE (1 vez e limpa state/storage)
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
          : String(matchInternal.name || matchInternal.nome_razao || nome || ""),
      }));
    } else {
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
        contactPerson: prev.contactPerson?.trim() ? prev.contactPerson : String(nome || ""),
      }));
    }

    clearClienteFromStorage();
    if (location.state?.cliente) {
      navigate(location.pathname, { replace: true, state: {} });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key, safeClients]);

  // HANDLERS
  const handleItemsChange = (newItems) =>
    setCurrentQuote((prev) => ({ ...prev, items: normalizeItems(newItems) })); // ✅ garante que edições também mantenham formato

  const handleInputChange = (e) => setCurrentQuote((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSelectChange = (name, value) => {
    const v = String(value);
    setCurrentQuote((prev) => ({ ...prev, [name]: v }));

    if (name === "client_id") {
      const selected =
        safeClients.find((c) => String(c.id) === v) ||
        (externalClientOption && String(externalClientOption.id) === v ? externalClientOption : null);

      if (selected) {
        try {
          localStorage.setItem("cotacao_cliente", JSON.stringify(selected));
        } catch {}
        setCurrentQuote((prev) => ({
          ...prev,
          client_id: v,
          contactPerson: prev.contactPerson?.trim()
            ? prev.contactPerson
            : String(selected.name || selected.nome_razao || ""),
        }));
      }
    }
  };

  const handleSelectClient = () => {
    const returnTo = `${location.pathname}${location.search || ""}`;
    navigate(`/clientes?returnTo=${encodeURIComponent(returnTo)}`);
  };

  // ITENS / TOTAIS
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
      // se você não usa total_tributos_item, deixa como 0 (não quebra)
      return acc + n(taxes.total_tributos_item || 0);
    }, 0);

    const totalGeral = subtotalProdutos + subtotalServicos + subtotalScm;
    return { subtotalProdutos, subtotalServicos, subtotalScm, totalTributos, totalGeral };
  }, [productItems, serviceItems, scmServiceItems, currentQuote.items]);

  // LISTS
  const companiesSelectList = useMemo(() => {
    const list = [...safeCompanies];
    if (externalCompanyOption && !list.some((c) => String(c.id) === String(externalCompanyOption.id))) {
      list.unshift(externalCompanyOption);
    }
    if (!list.length) {
      list.unshift({
        id: DEFAULT_COMPANY_ID,
        name: `${DEFAULT_COMPANY.name} (${DEFAULT_COMPANY.cnpj})`,
        cnpj: DEFAULT_COMPANY.cnpj,
        razao_social: DEFAULT_COMPANY.razao_social,
        nome_fantasia: DEFAULT_COMPANY.nome_fantasia,
        addresses: [],
      });
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

  const sellersSelectList = useMemo(() => {
    if (Array.isArray(bffSellers) && bffSellers.length > 0) return bffSellers;
    return safeSupabaseSellers;
  }, [bffSellers, safeSupabaseSellers]);

  // PDF PREVIEW DATA
  const pdfPreviewData = useMemo(() => {
    const company =
      safeCompanies.find((c) => String(c.id) === String(currentQuote.company_id)) ||
      externalCompanyOption ||
      {
        id: DEFAULT_COMPANY_ID,
        name: DEFAULT_COMPANY.name,
        cnpj: DEFAULT_COMPANY.cnpj,
        razao_social: DEFAULT_COMPANY.razao_social,
        nome_fantasia: DEFAULT_COMPANY.nome_fantasia,
        addresses: [],
      };

    const client =
      safeClients.find((c) => String(c.id) === String(currentQuote.client_id)) || (externalClientOption || null);

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
      company: company ? { ...company, addresses: safeAddresses.filter((addr) => addr.company_id === company.id) } : null,
      client: client ? { ...client, addresses: safeAddresses.filter((addr) => addr.client_id === client.id) } : null,
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

  const validatePdfData = () => {
    if (!pdfPreviewData.company || !pdfPreviewData.client) {
      toast({ variant: "destructive", title: "Dados incompletos", description: "Selecione empresa e cliente para gerar o PDF." });
      return false;
    }
    return true;
  };

  const handleOpenPreview = () => {
    if (!currentQuote.client_id) {
      toast({ variant: "destructive", title: "Selecione um cliente", description: "Escolha um cliente antes de gerar o PDF." });
      return;
    }
    setIsPreviewOpen(true);
  };

  const handlePdfConfirm = async (template, meta) => {
    const action = meta?.action || "download";
    if (!validatePdfData()) return;

    const payload = { ...pdfPreviewData, template };

    try {
      if (action === "print") {
        const result = await generateQuotePDF(payload, { download: false });
        const url = normalizePdfResultToUrl(result);
        if (url) openAndPrintUrl(url);
        else {
          await generateQuotePDF(payload);
          toast({ title: "PDF gerado", description: "O gerador baixou o PDF, mas não retornou URL/Blob para impressão automática." });
        }
        return;
      }
      await generateQuotePDF(payload);
    } catch (e) {
      toast({ variant: "destructive", title: action === "print" ? "Erro ao imprimir" : "Erro ao gerar PDF", description: e?.message || String(e) });
    }
  };

  // ✅ SUBMIT -> SALVA NO BFF (via addQuote do DataContext atualizado)
  const handleSubmit = async (e) => {
    e.preventDefault();

    const fixedCompanyId = String(currentQuote.company_id || DEFAULT_COMPANY_ID);
    const fixedSellerId = String(currentQuote.seller_id || bffUser?.sub || "");
    const fixedClientId = String(currentQuote.client_id || "");

    const missing = [];
    if (!fixedCompanyId.trim()) missing.push("Empresa");
    if (!fixedClientId.trim()) missing.push("Cliente");
    if (!fixedSellerId.trim()) missing.push("Vendedor");

    if (missing.length) {
      toast({ variant: "destructive", title: "Campos obrigatórios", description: `Faltando: ${missing.join(", ")}.` });
      return;
    }

    const isExternalCompany = fixedCompanyId.startsWith("static:");
    const isExternalClient = fixedClientId.startsWith("voalle:");

    const companyName = safeText(DEFAULT_COMPANY.name);
    const companyDoc = safeText(DEFAULT_COMPANY.cnpj);

    const clientName =
      safeClients.find((c) => String(c.id) === fixedClientId)?.name ||
      safeClients.find((c) => String(c.id) === fixedClientId)?.nome_razao ||
      safeText(externalClientOption?.name || externalClientOption?.nome_razao || "");

    const clientDoc =
      safeClients.find((c) => String(c.id) === fixedClientId)?.cpf_cnpj ||
      safeClients.find((c) => String(c.id) === fixedClientId)?.txIdFormated ||
      safeText(externalClientOption?.cpf_cnpj || externalClientOption?.txIdFormated || externalClientOption?.txId || "");

    // ✅ payload no formato do DB do BFF (snake_case)
    const quotePayload = {
      id: currentQuote.id || undefined,

      proposal_number: safeText(currentQuote.proposal_number),
      revision: Number(currentQuote.revision || 0),
      status: safeText(currentQuote.status || "pending"),

      created_at: currentQuote.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),

      user_id: safeText(currentQuote.user_id || supabaseUser?.id || ""),
      seller_id: fixedSellerId,

      company_id: fixedCompanyId,
      client_id: fixedClientId,

      company_source: isExternalCompany ? "static" : "internal",
      client_source: isExternalClient ? "voalle" : "internal",
      client_external_id: isExternalClient ? String(fixedClientId.replace("voalle:", "")) : "",

      company_name: companyName,
      company_document: companyDoc,

      client_name: safeText(clientName),
      client_document: safeText(clientDoc),

      contact_person: safeText(currentQuote.contactPerson),

      validity_date: safeText(currentQuote.validity_date),
      payment_terms: safeText(currentQuote.payment_terms),
      freight_type: safeText(currentQuote.freight_type),
      delivery_location: safeText(currentQuote.delivery_location),
      notes: safeText(currentQuote.notes),

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
      const saved = await addQuote(quotePayload); // ✅ vai pro BFF
      toast({ title: currentQuote.id ? "Cotação atualizada!" : "Cotação criada!", description: "A cotação foi salva com sucesso." });

      if (saved?.id && !currentQuote.id) {
        setCurrentQuote((prev) => ({ ...prev, id: saved.id }));
      }

      navigate("/cotacoes");
    } catch (error) {
      toast({ variant: "destructive", title: "Erro ao Salvar", description: String(error?.message || error) });
    }
  };

  const canOpenPdf = Boolean(String(currentQuote.client_id || "").trim());
  const canSave =
    Boolean(String(currentQuote.company_id || DEFAULT_COMPANY_ID).trim()) &&
    Boolean(String(currentQuote.client_id || "").trim()) &&
    Boolean(String(currentQuote.seller_id || bffUser?.sub || "").trim());

  return (
    <div className="space-y-6">
      <motion.form onSubmit={handleSubmit} className="space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">{id ? "Editar Cotação" : "Criar Nova Cotação"}</h1>
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

            <Button type="submit" className="btn-primary" disabled={!canSave}>
              <Save className="w-4 h-4 mr-2" />
              Salvar Cotação
            </Button>
          </div>
        </div>

        <div className="floating-card p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
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

          <div>
            <Label htmlFor="client_id">Cliente</Label>
            <div className="flex items-center gap-2">
              <Select value={String(currentQuote.client_id || "")} onValueChange={(v) => handleSelectChange("client_id", v)}>
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

              <Button type="button" variant="secondary" className="btn-secondary flex-shrink-0" onClick={handleSelectClient}>
                <Users2 className="w-4 h-4 mr-2" />
                Selecionar
              </Button>
            </div>
          </div>

          <div>
            <Label htmlFor="seller_id">Vendedor</Label>
            <Select value={String(currentQuote.seller_id || "")} onValueChange={(v) => handleSelectChange("seller_id", v)}>
              <SelectTrigger className="input-field">
                <UserSquare className="w-4 h-4 mr-2 opacity-60" />
                <SelectValue placeholder={loadingSellers ? "Carregando vendedores..." : "Selecione o vendedor"} />
              </SelectTrigger>

              <SelectContent className="glass-effect">
                {sellersSelectList.map((s) => (
                  <SelectItem key={String(s.id)} value={String(s.id)}>
                    {String(s.name || s.nome || "Vendedor")} {s.email ? `(${s.email})` : ""}
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
            <div className="text-white/70 text-sm">Observação: “Aos cuidados” é salvo no campo contact_person do BFF.</div>
          </div>
          <div className="floating-card p-6">
            <QuoteTotals totais={totais} />
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