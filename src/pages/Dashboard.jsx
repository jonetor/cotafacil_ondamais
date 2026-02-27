import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, 
  DollarSign,
  CheckCircle,
  Clock,
  TrendingUp,
  Download,
  Copy,
  Edit,
  FileSpreadsheet
} from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"


const MetricCard = ({ icon: Icon, title, value, change, color, positive, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: delay * 0.1 }}
    className="metric-card p-5"
  >
    <div className="flex items-center justify-between mb-4">
      <div className={`w-12 h-12 bg-gradient-to-r ${color} rounded-lg flex items-center justify-center`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      {change && (
        <div className={`flex items-center space-x-1 text-sm ${positive ? 'text-green-400' : 'text-red-400'}`}>
          <TrendingUp className="w-4 h-4" />
          <span>{change}</span>
        </div>
      )}
    </div>
    <div>
      <h3 className="text-2xl font-bold text-white mb-1">{value}</h3>
      <p className="text-white/60 text-sm">{title}</p>
    </div>
  </motion.div>
);

function Dashboard() {
  const { quotes } = useData();
  const { user } = useAuth();
  const { toast } = useToast();
  const [period, setPeriod] = useState('month');

  const handleNotImplemented = (feature) => {
    toast({
      title: 'Funcionalidade em desenvolvimento',
      description: `🚧 A opção de ${feature} ainda não foi implementada.`,
    });
  };

  const filteredQuotes = useMemo(() => {
    const now = new Date();
    return quotes.filter(quote => {
      const quoteDate = new Date(quote.createdAt);
      if (period === 'day') {
        return quoteDate.toDateString() === now.toDateString();
      }
      if (period === 'week') {
        const oneWeekAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
        return quoteDate >= oneWeekAgo;
      }
      if (period === 'month') {
        return quoteDate.getMonth() === now.getMonth() && quoteDate.getFullYear() === now.getFullYear();
      }
      if (period === 'year') {
        return quoteDate.getFullYear() === now.getFullYear();
      }
      return true; // Should not happen
    });
  }, [quotes, period]);

  const totalValue = filteredQuotes.reduce((sum, q) => sum + (q.total || 0), 0);
  const approvedValue = filteredQuotes.filter(q => q.status === 'approved').reduce((sum, q) => sum + (q.total || 0), 0);
  const pendingCount = filteredQuotes.filter(q => q.status === 'pending').length;
  const approvedCount = filteredQuotes.filter(q => q.status === 'approved').length;
  
  const recentQuotes = [...filteredQuotes].sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);

  const isAdmin = user.role === 'admin';

  const getStatusInfo = (status) => {
    switch(status) {
      case 'approved': return { text: 'Aprovada', color: 'text-green-400', bg: 'bg-green-500/20' };
      case 'rejected': return { text: 'Rejeitada', color: 'text-red-400', bg: 'bg-red-500/20' };
      case 'pending':
      default:
        return { text: 'Pendente', color: 'text-yellow-400', bg: 'bg-yellow-500/20' };
    }
  };

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Dashboard Comercial</h1>
            <p className="text-white/60 mt-1">Visão geral do desempenho de suas propostas.</p>
          </div>
          <div className="flex items-center gap-2 bg-slate-800/50 p-1 rounded-lg">
            {['day', 'week', 'month', 'year'].map(p => (
              <Button 
                key={p} 
                onClick={() => setPeriod(p)}
                variant="ghost" 
                className={`capitalize transition-colors duration-300 ${period === p ? 'bg-teal-500/20 text-teal-300' : 'text-white/60 hover:text-white hover:bg-slate-700/50'}`}
              >
                {p === 'day' ? 'Dia' : p === 'week' ? 'Semana' : p === 'month' ? 'Mês' : 'Ano'}
              </Button>
            ))}
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard icon={FileText} title="Propostas Enviadas" value={filteredQuotes.length} color="from-sky-500 to-cyan-500" delay={1} />
        <MetricCard icon={DollarSign} title="Valor Total" value={`R$ ${totalValue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`} color="from-blue-500 to-indigo-500" delay={2} />
        <MetricCard icon={CheckCircle} title="Propostas Aprovadas" value={approvedCount} color="from-green-500 to-teal-500" delay={3} />
        <MetricCard icon={Clock} title="Aguardando Aceite" value={pendingCount} color="from-yellow-500 to-amber-500" delay={4} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="lg:col-span-2 floating-card p-6"
        >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-white">Cotações Recentes</h3>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="btn-secondary">
                    <Download className="w-4 h-4 mr-2" /> Exportar Relatório
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="glass-effect border-white/20 text-white">
                  <DropdownMenuItem onClick={() => handleNotImplemented('exportação para PDF')}>
                    <FileText className="w-4 h-4 mr-2" /> PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleNotImplemented('exportação para Excel')}>
                    <FileSpreadsheet className="w-4 h-4 mr-2" /> Excel
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-700 text-sm text-white/60">
                    <th className="py-3 px-4">Cliente</th>
                    <th className="py-3 px-4 text-right">Valor</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {recentQuotes.length > 0 ? recentQuotes.map(quote => {
                    const status = getStatusInfo(quote.status);
                    return (
                      <tr key={quote.id} className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
                        <td className="py-3 px-4">
                          <p className="font-medium text-white">{quote.clientName}</p>
                          <p className="text-sm text-white/60">{new Date(quote.createdAt).toLocaleDateString('pt-BR')}</p>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-white">R$ {(quote.total || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-3 py-1 text-xs font-semibold rounded-full ${status.bg} ${status.color}`}>
                            {status.text}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                           <Button variant="ghost" size="icon" className="text-white/70 hover:text-white" onClick={() => handleNotImplemented('edição')}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-white/70 hover:text-white" onClick={() => handleNotImplemented('duplicação')}>
                            <Copy className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    )
                  }) : (
                    <tr>
                      <td colSpan="4" className="text-center py-10 text-white/60">
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
          transition={{ delay: 0.6 }}
          className="space-y-6"
        >
          {isAdmin && (
            <div className="floating-card p-6">
              <h3 className="text-xl font-semibold text-white mb-4">Visão do Administrador</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-white/80"><p>Taxa de Conversão:</p><p className="font-semibold text-white">{filteredQuotes.length > 0 ? ((approvedCount / filteredQuotes.length) * 100).toFixed(1) : 0}%</p></div>
                <div className="flex justify-between items-center text-white/80"><p>Ticket Médio Aprovado:</p><p className="font-semibold text-white">R$ {approvedCount > 0 ? (approvedValue/approvedCount).toLocaleString('pt-BR', {minimumFractionDigits: 2}) : '0,00'}</p></div>
                <div className="flex justify-between items-center text-white/80"><p>Prazo Médio (mock):</p><p className="font-semibold text-white">5 dias</p></div>
              </div>
            </div>
          )}
          <div className="floating-card p-6">
            <h3 className="text-xl font-semibold text-white mb-4">Financeiro</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-white/80"><p>Valor Aprovado:</p><p className="font-semibold text-green-400">R$ {approvedValue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p></div>
              <div className="flex justify-between items-center text-white/80"><p>Impostos (mock):</p><p className="font-semibold text-white">R$ {(approvedValue * 0.1).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p></div>
            </div>
          </div>
        </motion.div>
      </div>

    </div>
  );
}

export default Dashboard;