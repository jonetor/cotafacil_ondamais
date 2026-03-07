import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Helmet } from "react-helmet";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, Plus, Search, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import CompanyForm from "@/components/companies/CompanyForm";
import CompanyCard from "@/components/companies/CompanyCard";
import { fmtCNPJ } from "@/lib/cnpjUtils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useNavigate } from "react-router-dom";

/* =========================
   HELPERS
========================= */

async function safeJson(res) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return { ok: false, error: text || "Resposta inválida" };
  }
}

function onlyDigits(s) {
  return String(s || "").replace(/\D/g, "");
}

function norm(s) {
  return String(s || "")
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/* =========================
   PAGE
========================= */

const Companies = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingData, setEditingData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [companyToDelete, setCompanyToDelete] = useState(null);

  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  // ✅ LOAD from BFF
  const fetchCompanies = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/companies", { method: "GET" });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);

      const list = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
      setCompanies(list);
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar empresas",
        description: e?.message || String(e),
      });
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  // ✅ padroniza para CompanyCard (se ele espera campos antigos)
  const companiesNormalized = useMemo(() => {
    const list = Array.isArray(companies) ? companies : [];
    return list.map((c) => ({
      ...c,
      // compat: algumas telas antigas usam "fantasia"
      fantasia: c.fantasia || c.nome_fantasia || c.nomeFantasia || c.name || "",
      // compat: algumas telas antigas usam "name"
      name: c.name || c.nome_fantasia || c.fantasia || "",
      // compat: mantém cnpj
      cnpj: c.cnpj || "",
      // compat: address placeholder (no modo atual não há addresses)
      address: c.address || {},
    }));
  }, [companies]);

  const filteredCompanies = useMemo(() => {
    const s = norm(searchTerm);
    const sDigits = onlyDigits(searchTerm);

    if (!s && !sDigits) return companiesNormalized;

    return companiesNormalized.filter((company) => {
      const name = norm(company?.name);
      const fantasia = norm(company?.fantasia);
      const cnpjDigits = onlyDigits(company?.cnpj);

      if (sDigits) return cnpjDigits.includes(sDigits);
      return name.includes(s) || fantasia.includes(s);
    });
  }, [companiesNormalized, searchTerm]);

  const handleNewCompany = () => {
    setEditingData(null);

    // No seu modo atual (BFF SQLite), ainda não existe POST/PUT de companies.
    // Para não quebrar, apenas abre o modal e informa.
    setIsFormOpen(true);
    toast({
      title: "Cadastro de empresas",
      description: "No modo atual, as empresas estão fixas no BFF (/api/companies). Se quiser CRUD, eu adiciono no backend.",
    });
  };

  const handleEditCompany = (company) => {
    // Mantém o fluxo antigo
    navigate(`/empresas/${company.id}`);
  };

  const handleSaveCompany = async () => {
    // No modo atual, não há addCompany no backend.
    // Mantemos o modal sem quebrar e orientamos.
    setIsSubmitting(true);
    try {
      toast({
        variant: "destructive",
        title: "Não implementado",
        description: "CRUD de empresas ainda não existe no backend. Posso implementar /api/companies (POST/PUT/DELETE).",
      });
    } finally {
      setIsSubmitting(false);
      setIsFormOpen(false);
      setEditingData(null);
      // recarrega só para manter consistente
      fetchCompanies();
    }
  };

  const handleDeleteCompany = async (id) => {
    // No modo atual, não há delete.
    toast({
      variant: "destructive",
      title: "Não implementado",
      description: "Excluir empresa ainda não está habilitado no backend.",
    });
    setCompanyToDelete(null);
    // se quiser, depois eu implemento DELETE /api/companies/:id e removo esse bloqueio
  };

  return (
    <div className="text-slate-200 min-h-full -m-8 p-8">
      <Helmet>
        <title>Empresas | CotaFácil</title>
      </Helmet>

      <div className="space-y-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-100">Empresas</h1>
              <p className="text-slate-400 mt-1">Empresas cadastradas para emissão de orçamentos.</p>
            </div>

            <div className="flex items-center gap-2">
              <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogTrigger asChild>
                  <Button className="btn-primary" onClick={handleNewCompany}>
                    <Plus className="w-4 h-4 mr-2" /> Nova Empresa
                  </Button>
                </DialogTrigger>

                <CompanyForm
                  editingData={editingData}
                  onSave={handleSaveCompany}
                  onCancel={() => {
                    setIsFormOpen(false);
                    setEditingData(null);
                  }}
                  isSubmitting={isSubmitting}
                />
              </Dialog>
            </div>
          </div>
        </motion.div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <Input
            placeholder="Buscar por nome, fantasia ou CNPJ..."
            className="pl-10 w-full md:w-1/3 input-field"
            value={searchTerm}
            onChange={(e) => setSearchTerm(fmtCNPJ(e.target.value))}
          />
        </div>

        {loading ? (
          <div className="text-center py-16 text-slate-500">
            Carregando empresas...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {filteredCompanies.map((company, index) => (
                <CompanyCard
                  key={company.id}
                  company={company}
                  index={index}
                  onEdit={handleEditCompany}
                  onDelete={() => setCompanyToDelete(company)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}

        {!loading && filteredCompanies.length === 0 && (
          <div className="text-center py-16 text-slate-500 col-span-full">
            <Building2 className="w-16 h-16 mx-auto mb-4" />
            <h3 className="text-xl font-semibold">Nenhuma empresa encontrada</h3>
            <p>Tente ajustar sua busca.</p>
          </div>
        )}
      </div>

      <AlertDialog open={!!companyToDelete} onOpenChange={() => setCompanyToDelete(null)}>
        <AlertDialogContent className="glass-effect border-slate-700 text-slate-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center text-slate-100">
              <Trash2 className="w-5 h-5 mr-2 text-red-400" />
              Confirmar Exclusão
            </AlertDialogTitle>

            <AlertDialogDescription className="text-slate-400">
              Tem certeza de que deseja excluir a empresa{" "}
              <span className="font-bold text-amber-400">{companyToDelete?.name}</span>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleDeleteCompany(companyToDelete?.id)}
              className="bg-red-500 hover:bg-red-600"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Companies;