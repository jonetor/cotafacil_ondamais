import React, { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import { motion, AnimatePresence } from "framer-motion";
import { Users2, Plus, Search, Loader2, RefreshCcw } from "lucide-react";
import { useData } from "@/contexts/SupabaseDataContext";
import { useAuth } from "@/contexts/SupabaseAuthContext";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocation, useNavigate } from "react-router-dom";
import ClientCard from "@/components/clients/ClientCard";
import { cpfMask, cnpjMask } from "@/lib/masks";
import axios from "axios";

const onlyDigits = (s) => String(s || "").replace(/\D/g, "");

async function searchClientesDb(q, limit = 50) {
  const resp = await axios.get("/api/voalle/clientes-db", { params: { q, limit } });
  return resp.data; // { total, items }
}

async function syncClientesDb(pageSize = 5000) {
  const resp = await axios.post("/api/voalle/sync-clientes", null, { params: { pageSize } });
  return resp.data; // { ok, total, lastPageCount }
}

const Clients = () => {
  const { deleteClient } = useData();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ Role: admin vê "Novo Cliente"; vendedor não vê
  const role = user?.role || user?.user_metadata?.role || "seller";
  const isSeller = role !== "admin";

  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [dbClients, setDbClients] = useState([]);

  const loadClients = async (term) => {
    setLoading(true);
    try {
      const { items } = await searchClientesDb(term, 60);
      const adapted = (items || []).map((c) => ({
        ...c,
        fantasia: c.fantasia ?? c.nome_fantasia ?? "",
        cpf_cnpj: c.cpf_cnpj ?? "",
        nome_razao: c.nome_razao ?? "",
      }));
      setDbClients(adapted);
    } catch (e) {
      console.error(e);
      setDbClients([]);
      toast({
        variant: "destructive",
        title: "Erro ao buscar clientes",
        description:
          e?.response?.data?.error ||
          e?.message ||
          "Falha ao consultar a base local (BFF).",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => loadClients(searchTerm), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  const filteredClients = useMemo(() => dbClients, [dbClients]);

  const handleEditClient = (client) => navigate(`/clientes/editar/${client.id}`);

  const handleDeleteClient = (id) => {
    deleteClient(id);
    toast({ title: "Cliente excluído com sucesso!" });
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    const cleanValue = onlyDigits(value);

    if (cleanValue.length > 11) setSearchTerm(cnpjMask(value));
    else if (cleanValue.length > 0) setSearchTerm(cpfMask(value));
    else setSearchTerm(value);
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      const data = await syncClientesDb(5000);
      toast({
        title: "Base do Voalle atualizada!",
        description: `Sincronizados: ${data?.total ?? 0} clientes`,
      });
      await loadClients(searchTerm);
    } catch (e) {
      console.error(e);
      toast({
        variant: "destructive",
        title: "Erro ao atualizar base",
        description:
          e?.response?.data?.error ||
          e?.message ||
          "Falha ao sincronizar com o Voalle.",
      });
    } finally {
      setSyncing(false);
    }
  };

  // ✅ seleciona cliente e vai para Cotação
  const handleSelectClient = (client) => {
    localStorage.setItem("cotacao_cliente", JSON.stringify(client));

    const params = new URLSearchParams(location.search);
    const returnTo = params.get("returnTo") || "/cotacoes/novo";

    navigate(returnTo, { state: { cliente: client } });
  };

  return (
    <div className="text-slate-200 min-h-full -m-8 p-8">
      <Helmet>
        <title>Clientes | ONDA+</title>
      </Helmet>

      <div className="space-y-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-100">Clientes</h1>
              <p className="text-slate-400 mt-1">Gerencie seus clientes PF e PJ.</p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                className="btn-secondary"
                onClick={handleSync}
                disabled={syncing}
                title="Atualiza a base local (SQLite) puxando do Voalle"
              >
                {syncing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Atualizando...
                  </>
                ) : (
                  <>
                    <RefreshCcw className="w-4 h-4 mr-2" /> Atualizar base Voalle
                  </>
                )}
              </Button>

              {/* 🔒 SOMENTE ADMIN VÊ */}
              {!isSeller && (
                <Button className="btn-primary" onClick={() => navigate("/clientes/novo")}>
                  <Plus className="w-4 h-4 mr-2" /> Novo Cliente
                </Button>
              )}
            </div>
          </div>
        </motion.div>

        <div className="relative flex items-center gap-3">
          <div className="relative w-full md:w-1/3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <Input
              placeholder="Buscar por nome, fantasia ou CPF/CNPJ..."
              className="pl-10 w-full input-field"
              value={searchTerm}
              onChange={handleSearchChange}
            />
          </div>

          {loading && (
            <div className="flex items-center text-slate-400 text-sm">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Buscando...
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredClients.map((client, index) => (
              <ClientCard
                key={client.id}
                client={client}
                index={index}
                onEdit={handleEditClient}
                onDelete={handleDeleteClient}
                onSelect={handleSelectClient}
              />
            ))}
          </AnimatePresence>
        </div>

        {filteredClients.length === 0 && !loading && (
          <div className="text-center py-16 text-slate-500 col-span-full">
            <Users2 className="w-16 h-16 mx-auto mb-4" />
            <h3 className="text-xl font-semibold">Nenhum cliente encontrado</h3>

            {/* ✅ evita sugerir “adicionar” para vendedor */}
            {!isSeller ? (
              <p>Tente ajustar sua busca ou adicione um novo cliente.</p>
            ) : (
              <p>Tente ajustar sua busca.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Clients;