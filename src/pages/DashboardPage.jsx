import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, 
  DollarSign,
  CheckCircle,
  Clock,
  Download,
  Copy,
  Edit,
  FileSpreadsheet,
  User
} from 'lucide-react';
import { useData } from '@/contexts/SupabaseDataContext';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Helmet } from 'react-helmet';

const MetricCard = ({ icon: Icon, title, value, color, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: delay * 0.1, duration: 0.5 }}
    className="metric-card p-5"
  >
    <div className="flex items-start justify-between">
      <div className="space-y-1">
        <p className="text-sm text-slate-400">{title}</p>
        <h3 className="text-3xl font-bold text-slate-100">{value}</h3>
      </div>
      <div className={`w-12 h-12 bg-gradient-to-br ${color} rounded-lg flex items-center justify-center shadow-lg`}>
        <Icon className="w-6 h-6 text-slate-900" />
      </div>
    </div>
  </motion.div>
);

const DashboardPage = () => {
  const { quotes, clients, sellers } = useData();
  const { user } = useAuth();
  const { toast } = useToast();
  const [period, setPeriod] = useState('month');

  const [sellerFilter, setSellerFilter] = useState("");

  const handleNotImplemented = (feature) => {
    toast({
      title: 'Funcionalidade em desenvolvimento',
      description: `🚧 A opção de ${feature} ainda não foi implementada.`,
    });
  };

  const role = String(user?.role || user?.user_metadata?.role || "").toLowerCase();
  const isAdmin = role === "admin";

  const loggedId = String(user?.sub || user?.id || "").trim();

  const sellersList = Array.isArray(sellers) ? sellers : [];

  const filteredQuotes = useMemo(() => {
    const now = new Date();
    if (!Array.isArray(quotes)) return [];

    let list = quotes.filter((quote) => {
      const quoteDate = new Date(quote.created_at);
      if (Number.isNaN(quoteDate.getTime())) return false;

      if (period === 'day') return quoteDate.toDateString() === now.toDateString();
      if (period === 'week') {
        const oneWeekAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
        return quoteDate >= oneWeekAgo;
      }
      if (period === 'month') return quoteDate.getMonth() === now.getMonth() && quoteDate.getFullYear() === now.getFullYear();
      if (period === 'year') return quoteDate.getFullYear() === now.getFullYear();
      return true;
    });

    if (!isAdmin) {
      if (!loggedId) return [];
      list = list.filter((q) => String(q.seller_id || "") === loggedId);
    } else {
      if (sellerFilter) {
        list = list.filter((q) => String(q.seller_id || "") === String(sellerFilter));
      }
    }

    return list;
  }, [quotes, period, isAdmin, loggedId, sellerFilter]);

  const totalValue = filteredQuotes.reduce((sum, q) => sum + (Number(q.total_value) || 0), 0);
  const approvedQuotes = filteredQuotes.filter(q => String(q.status || "").toLowerCase() === 'approved');
  const approvedValue = approvedQuotes.reduce((sum, q) => sum + (Number(q.total_value) || 0), 0);
  const pendingCount = filteredQuotes.filter(q => String(q.status || "").toLowerCase() === 'pending').length;

  const recentQuotes = [...filteredQuotes].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5);

  const getStatusInfo = (status) => {
    switch(String(status || "").toLowerCase()) {
      case 'approved': return { text: 'Aprovada', color: 'text-green-400', bg: 'bg-green-500/10' };
      case 'rejected': return { text: 'Rejeitada', color: 'text-red-400', bg: 'bg-red-500/10' };
      default: return { text: 'Pendente', color: 'text-yellow-400', bg: 'bg-yellow-500/10' };
    }
  };

  const getClientName = (clientId, snapshotName) => {
    if (snapshotName) return snapshotName;
    const client = Array.isArray(clients) ? clients.find(c => String(c.id) === String(clientId)) : null;
    return client?.fantasia || client?.name || client?.nome_razao || 'Cliente não encontrado';
  };

  const getSellerLabel = (id) => {
    const s = sellersList.find(x => String(x.id) === String(id));
    if (!s) return "Vendedor";
    const email = s.email ? ` (${s.email})` : "";
    return `${s.name || s.nome || "Vendedor"}${email}`;
  };

  return (
    <div className="text-slate-200 min-h-full -m-8 p-8">
      <Helmet>
        <title>Dashboard | ONDA+</title>
      </Helmet>

      <div className="space-y-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-100">Dashboard Comercial</h1>
              <p className="text-slate-400 mt-1">
                {isAdmin ? "Admin: visão de todas as vendas (filtre por vendedor)." : "Vendedor: visão apenas das suas vendas."}
              </p>
            </div>

            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2">
              <div className="flex items-center gap-2 bg-slate-800/50 p-1 rounded-lg border border-slate-700">
                {[{key: 'day', label: 'Dia'}, {key: 'week', label: 'Semana'}, {key: 'month', label: 'Mês'}, {key: 'year', label: 'Ano'}].map(p => (
                  <Button 
                    key={p.key} 
                    onClick={() => setPeriod(p.key)}
                    variant="ghost" 
                    className={`capitalize transition-colors duration-300 rounded-md px-4 py-1 text-sm ${period === p.key ? 'bg-blue-600/30 text-blue-300' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'}`}
                  >
                    {p.label}
                  </Button>
                ))}
              </div>

              {isAdmin ? (
                <div className="flex items-center gap-2 bg-slate-800/50 p-1 rounded-lg border border-slate-700 px-3">
                  <User className="w-4 h-4 text-slate-400" />
                  <select
                    value={sellerFilter}
                    onChange={(e) => setSellerFilter(e.target.value)}
                    className="bg-transparent text-slate-200 text-sm outline-none py-2"
                    title="Filtrar por vendedor"
                  >
                    <option value="" className="bg-slate-900">Todos vendedores</option>
                    {sellersList.map((s) => (
                      <option key={s.id} value={String(s.id)} className="bg-slate-900">
                        {getSellerLabel(s.id)}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard icon={FileText} title="Propostas Enviadas" value={filteredQuotes.length} color="from-blue-400 to-cyan-400" delay={1} />
          <MetricCard icon={DollarSign} title="Valor Total" value={`R$ ${totalValue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`} color="from-purple-400 to-blue-400" delay={2} />
          <MetricCard icon={CheckCircle} title="Propostas Aprovadas" value={approvedQuotes.length} color="from-green-400 to-teal-400" delay={3} />
          <MetricCard icon={Clock} title="Aguardando Aceite" value={pendingCount} color="from-yellow-400 to-amber-400" delay={4} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="lg:col-span-2 floating-card p-6"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-slate-100">Cotações Recentes</h3>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="btn-secondary">
                    <Download className="w-4 h-4 mr-2" /> Exportar Relatório
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="glass-effect border-slate-700 text-slate-200">
                  <DropdownMenuItem onClick={() => handleNotImplemented('exportação para PDF')} className="cursor-pointer hover:!bg-slate-700">
                    <FileText className="w-4 h-4 mr-2" /> PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleNotImplemented('exportação para Excel')} className="cursor-pointer hover:!bg-slate-700">
                    <FileSpreadsheet className="w-4 h-4 mr-2" /> Excel
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-700 text-sm text-slate-400">
                    <th className="py-3 px-4 font-normal">Cliente</th>
                    <th className="py-3 px-4 font-normal text-right">Valor</th>
                    <th className="py-3 px-4 font-normal text-center">Status</th>
                    <th className="py-3 px-4 font-normal text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {recentQuotes.length > 0 ? recentQuotes.map(quote => {
                    const status = getStatusInfo(quote.status);
                    const clientName = getClientName(quote.client_id, quote.client_name);
                    return (
                      <motion.tr 
                        key={quote.id} 
                        className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        <td className="py-3 px-4">
                          <p className="font-medium text-slate-200">{clientName}</p>
                          <p className="text-sm text-slate-400">{new Date(quote.created_at).toLocaleDateString('pt-BR')}</p>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-200">
                          R$ {(quote.total_value || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-3 py-1 text-xs font-semibold rounded-full ${status.bg} ${status.color}`}>
                            {status.text}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button variant="ghost" size="icon" className="text-slate-400 hover:text-blue-400" onClick={() => handleNotImplemented('edição')}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-slate-400 hover:text-cyan-400" onClick={() => handleNotImplemented('duplicação')}>
                            <Copy className="w-4 h-4" />
                          </Button>
                        </td>
                      </motion.tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan="4" className="text-center py-16 text-slate-500">
                        Nenhuma cotação no período selecionado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="space-y-6"
          >
            {isAdmin && (
              <div className="floating-card p-6">
                <h3 className="text-xl font-semibold text-slate-100 mb-4">Visão do Administrador</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-slate-300">
                    <p>Taxa de Conversão:</p>
                    <p className="font-semibold text-slate-100">
                      {filteredQuotes.length > 0 ? ((approvedQuotes.length / filteredQuotes.length) * 100).toFixed(0) : 0}%
                    </p>
                  </div>
                  <div className="flex justify-between items-center text-slate-300">
                    <p>Ticket Médio Aprovado:</p>
                    <p className="font-semibold text-slate-100">
                      R$ {approvedQuotes.length > 0 ? (approvedValue/approvedQuotes.length).toLocaleString('pt-BR', {minimumFractionDigits: 2}) : '0,00'}
                    </p>
                  </div>
                  <div className="flex justify-between items-center text-slate-300">
                    <p>Prazo Médio (mock):</p>
                    <p className="font-semibold text-slate-100">5 dias</p>
                  </div>
                </div>
              </div>
            )}

            <div className="floating-card p-6">
              <h3 className="text-xl font-semibold text-slate-100 mb-4">Financeiro</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-slate-300">
                  <p>Valor Aprovado:</p>
                  <p className="font-semibold text-green-400">
                    R$ {approvedValue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                  </p>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <p>Impostos (mock):</p>
                  <p className="font-semibold text-slate-100">
                    R$ {(approvedValue * 0.1).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                  </p>
                </div>
              </div>
            </div>

          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;