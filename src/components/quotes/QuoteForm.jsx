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
import { Save, PlusCircle, Building, FileDown, User, UserSquare } from "lucide-react";
import QuoteItemsManager from "@/components/quotes/QuoteItemsManager";
import QuoteNotes from "@/components/quotes/QuoteNotes";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import QuoteTotals from "@/components/quotes/QuoteTotals";
import ClientForm from "@/components/clients/ClientForm";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
    addClient,
    quotes,
    addQuote,
    companies,
    users,
    user: supabaseUser,
    addresses,
    sellers: supabaseSellers, // fallback antigo
  } = useData();

  const { user: bffUser } = useAuth(); // ✅ user do BFF: {sub, email, role, name}
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

  const [isClientDialogOpen, setIsClientDialogOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // ✅ carrega vendedores do BFF
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

  // ✅ init quote (proposal, user_id)
  useEffect(() => {
    const userId = supabaseUser?.id || "";

    if (id) {
      const quote = quotes.find((q) => String(q.id) === String(id));
      if (quote) {
        setCurrentQuote({
          ...quote,
          user_id: userId,
          items: quote.items || [],
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

  // ✅ define vendedor padrão = vendedor logado (BFF)
  useEffect(() => {
    if (id) return; // editando: não sobrescreve
    if (!bffUser?.sub) return;

    setCurrentQuote((prev) => {
      if (prev.seller_id) return prev;
      return { ...prev, seller_id: String(bffUser.sub) };
    });
  }, [bffUser, id]);

  // ✅ empresa emitente fixa
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

  // ✅ recebe cliente selecionado
  useEffect(() => {
    const cli = location.state?.cliente || readClienteFromStorage();
    if (!cli) return;

    const docDigits = onlyDigits(cli.cpf_cnpj || cli.txIdFormated || cli.txId || "");
    const nome = cli.nome_razao || cli.name || cli.nome || "";

    const matchInternal =
      clients?.find((c) => onlyDigits(c?.cpf_cnpj) === docDigits) ||
      clients?.find((c) => onlyDigits(c?.txId) === docDigits);

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
  }, [location.state, clients]);

  const handleItemsChange = (newItems) => setCurrentQuote((prev) => ({ ...prev, items: newItems }));
  const handleInputChange = (e) => setCurrentQuote((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSelectChange = (name, value) => {
    const v = String(value);
    setCurrentQuote((prev) => ({ ...prev, [name]: v }));

    if (name === "client_id") {
      const selected =
        (clients || []).find((c) => String(c.id) === v) ||
        (externalClientOption && String(externalClientOption.id) === v ? externalClientOption : null);

      if (selected) {
        localStorage.setItem("cotacao_cliente", JSON.stringify(selected));
        setCurrentQuote((prev) => ({
          ...prev,
          client_id: v,
          contactPerson: prev.contactPerson?.trim() ? prev.contactPerson : (selected.name || selected.nome_razao || ""),
        }));
      }
    }
  };

  const handleSaveNewClient = async (clientData) => {
    try {
      const newClient = await addClient(clientData);
      if (newClient) {
        toast({ title: "Cliente cadastrado!", description: "Novo cliente foi adicionado ao sistema." });
        handleSelectChange("client_id", newClient.id);
        setIsClientDialogOpen(false);
      }
    } catch {}
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

  // ✅ lista vendedores para o select (BFF primeiro, fallback supabase)
  const sellersSelectList = useMemo(() => {
    if (Array.isArray(bffSellers) && bffSellers.length > 0) return bffSellers;
    return Array.isArray(supabaseSellers) ? supabaseSellers : [];
  }, [bffSellers, supabaseSellers]);

  const pdfPreviewData = useMemo(() => {
    const company =
      companies.find((c) => String(c.id) === String(currentQuote.company_id)) ||
      (externalCompanyOption ? externalCompanyOption : null);

    const client =
      clients.find((c) => String(c.id) === String(currentQuote.client_id)) ||
      (externalClientOption ? externalClientOption : null);

    const autor = users.find((u) => String(u.id) === String(currentQuote.user_id));

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
      company: company ? { ...company, addresses: addresses.filter((addr) => addr.company_id === company.id) } : null,
      client: client ? { ...client, addresses: addresses.filter((addr) => addr.client_id === client.id) } : null,
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

  const handleGeneratePDF = () => {
    if (!pdfPreviewData.company || !pdfPreviewData.client || !pdfPreviewData.autor || !pdfPreviewData.vendedor) {
      toast({
        variant: "destructive",
        title: "Dados incompletos",
        description: "Selecione empresa, cliente e vendedor para gerar o PDF.",
      });
      return;
    }
    generateQuotePDF(pdfPreviewData);
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

              <Dialog open={isClientDialogOpen} onOpenChange={setIsClientDialogOpen}>
                <DialogTrigger asChild>
                  <Button type="button" size="icon" className="btn-secondary flex-shrink-0">
                    <PlusCircle className="w-4 h-4" />
                  </Button>
                </DialogTrigger>

                <DialogContent className="glass-effect border-white/20 text-white max-w-5xl">
                  <DialogHeader>
                    <DialogTitle className="text-white">Novo Cliente</DialogTitle>
                  </DialogHeader>
                  <div className="max-h-[70vh] overflow-y-auto p-1">
                    <ClientForm onSave={handleSaveNewClient} onCancel={() => setIsClientDialogOpen(false)} />
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* ✅ Vendedor (BFF) */}
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