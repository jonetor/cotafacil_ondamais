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
import { useData } from "@/contexts/SupabaseDataContext";

/* =========================
   HELPERS
========================= */

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

function toUpperCompanyPayload(payload = {}) {
  return {
    ...payload,
    razao_social: String(payload.razao_social || "").toUpperCase(),
    nome_fantasia: String(payload.nome_fantasia || "").toUpperCase(),
    name: String(
      payload.name ||
        payload.nome_fantasia ||
        payload.razao_social ||
        ""
    ).toUpperCase(),
    fantasia: String(
      payload.fantasia ||
        payload.nome_fantasia ||
        payload.name ||
        ""
    ).toUpperCase(),
    cnpj: fmtCNPJ(payload.cnpj || ""),
    cnpj_digits: onlyDigits(payload.cnpj || payload.cnpj_digits || ""),
  };
}

/* =========================
   PAGE
========================= */

const Companies = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

  const {
    companies,
    loading,
    fetchCompanies,
    addCompany,
    deleteCompany,
  } = useData();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingData, setEditingData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [companyToDelete, setCompanyToDelete] = useState(null);

  const reloadCompanies = useCallback(async () => {
    try {
      await fetchCompanies?.();
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar empresas",
        description: e?.message || String(e),
      });
    }
  }, [fetchCompanies, toast]);

  useEffect(() => {
    reloadCompanies();
  }, [reloadCompanies]);

  const companiesNormalized = useMemo(() => {
    const list = Array.isArray(companies) ? companies : [];

    return list.map((c) => ({
      ...c,
      fantasia: c.fantasia || c.nome_fantasia || c.nomeFantasia || c.name || "",
      name:
        c.name ||
        c.razao_social ||
        c.nome_fantasia ||
        c.fantasia ||
        "",
      cnpj: c.cnpj || "",
      address: c.address || {},
    }));
  }, [companies]);

  const filteredCompanies = useMemo(() => {
    const s = norm(searchTerm);
    const sDigits = onlyDigits(searchTerm);

    if (!s && !sDigits) return companiesNormalized;

    return companiesNormalized.filter((company) => {
      const razao = norm(company?.razao_social || company?.name);
      const fantasia = norm(company?.fantasia || company?.nome_fantasia);
      const cnpjDigits = onlyDigits(company?.cnpj);

      if (sDigits) return cnpjDigits.includes(sDigits);
      return razao.includes(s) || fantasia.includes(s);
    });
  }, [companiesNormalized, searchTerm]);

  const handleNewCompany = () => {
    setEditingData(null);
    setIsFormOpen(true);
  };

  const handleEditCompany = (company) => {
    if (!company?.id) return;
    navigate(`/empresas/${company.id}`);
  };

  const handleSaveCompany = async (formData) => {
    setIsSubmitting(true);
    try {
      const payload = toUpperCompanyPayload(formData);

      await addCompany(payload);

      toast({
        title: "Empresa cadastrada com sucesso",
        description: `${payload.razao_social || payload.name} foi adicionada.`,
      });

      setIsFormOpen(false);
      setEditingData(null);
      await reloadCompanies();
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar empresa",
        description: e?.message || String(e),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCompany = async (id) => {
    try {
      await deleteCompany(id);

      toast({
        title: "Empresa excluída",
        description: "A empresa foi removida com sucesso.",
      });

      setCompanyToDelete(null);
      await reloadCompanies();
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Erro ao excluir empresa",
        description: e?.message || String(e),
      });
    }
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
              <p className="text-slate-400 mt-1">
                Empresas cadastradas para emissão de orçamentos.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogTrigger asChild>
                  <Button className="btn-primary" onClick={handleNewCompany}>
                    <Plus className="w-4 h-4 mr-2" />
                    Nova Empresa
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
                  company={{
                    ...company,
                    name: String(company.name || "").toUpperCase(),
                    fantasia: String(company.fantasia || "").toUpperCase(),
                    nome_fantasia: String(company.nome_fantasia || company.fantasia || "").toUpperCase(),
                    razao_social: String(company.razao_social || company.name || "").toUpperCase(),
                  }}
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
              <span className="font-bold text-amber-400">
                {String(
                  companyToDelete?.razao_social ||
                    companyToDelete?.name ||
                    ""
                ).toUpperCase()}
              </span>
              ? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel className="btn-secondary">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => handleDeleteCompany(companyToDelete?.id)}
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