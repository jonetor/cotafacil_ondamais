import React, { useState, useMemo } from 'react';
    import { Helmet } from 'react-helmet';
    import { motion } from 'framer-motion';
    import { useData } from '@/contexts/SupabaseDataContext';
    import { useToast } from '@/components/ui/use-toast';
    import { Button } from '@/components/ui/button';
    import { Input } from '@/components/ui/input';
    import { useNavigate } from 'react-router-dom';
    import { Plus, Edit, Trash2, Search, FileText } from 'lucide-react';
    import {
      AlertDialog,
      AlertDialogAction,
      AlertDialogCancel,
      AlertDialogContent,
      AlertDialogDescription,
      AlertDialogFooter,
      AlertDialogHeader,
      AlertDialogTitle,
      AlertDialogTrigger,
    } from "@/components/ui/alert-dialog";
    import { format } from 'date-fns';
    
    const Quotes = () => {
        const { quotes, clients, deleteQuote } = useData();
        const navigate = useNavigate();
        const { toast } = useToast();
        const [searchTerm, setSearchTerm] = useState('');
    
        const quotesWithClientNames = useMemo(() => {
            return (quotes ?? []).map(quote => {
                const client = (clients ?? []).find(c => c.id === quote.client_id);
                return {
                    ...quote,
                    clientName: client ? (client.name || client.nome_razao) : 'Cliente não encontrado',
                };
            }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        }, [quotes, clients]);
    
        const filteredQuotes = useMemo(() => {
            const s = searchTerm.toLowerCase();
            return quotesWithClientNames.filter(q =>
                (q.proposal_number?.toLowerCase().includes(s)) ||
                (q.clientName?.toLowerCase().includes(s))
            );
        }, [quotesWithClientNames, searchTerm]);
    
        const handleDelete = (id, proposalNumber) => {
            deleteQuote(id);
            toast({
                variant: "destructive",
                title: "Cotação excluída!",
                description: `A cotação Nº ${proposalNumber} foi removida.`,
            });
        };
        
        const getStatusClass = (status) => {
            switch (status) {
                case 'approved': return 'bg-green-500/20 text-green-300';
                case 'rejected': return 'bg-red-500/20 text-red-300';
                case 'pending': return 'bg-yellow-500/20 text-yellow-300';
                default: return 'bg-slate-500/20 text-slate-300';
            }
        };
    
        return (
            <div className="text-slate-200 min-h-full -m-8 p-8">
                <Helmet>
                    <title>Cotações | ONDA+</title>
                </Helmet>
                
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-100">Cotações</h1>
                            <p className="text-slate-400 mt-1">Gerencie suas propostas comerciais.</p>
                        </div>
                        <Button className="btn-primary w-full md:w-auto" onClick={() => navigate('/cotacoes/novo')}>
                            <Plus className="w-4 h-4 mr-2" />
                            Nova Cotação
                        </Button>
                    </div>
                </motion.div>
    
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="mt-8">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                        <Input 
                            placeholder="Buscar por nº da proposta ou cliente..." 
                            className="pl-10 w-full md:w-1/3 input-field"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </motion.div>
    
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mt-6">
                    <div className="overflow-x-auto rounded-lg border border-slate-800">
                        <table className="min-w-full text-sm text-slate-200">
                            <thead className="bg-slate-800/60 text-slate-400">
                                <tr>
                                    <th className="p-3 text-left font-semibold">Proposta</th>
                                    <th className="p-3 text-left font-semibold">Cliente</th>
                                    <th className="p-3 text-left font-semibold">Data</th>
                                    <th className="p-3 text-right font-semibold">Valor</th>
                                    <th className="p-3 text-center font-semibold">Status</th>
                                    <th className="p-3 w-32"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredQuotes.map(quote => (
                                    <tr key={quote.id} className="border-t border-slate-800 hover:bg-slate-800/40 transition-colors">
                                        <td className="p-3 font-mono text-slate-100">{quote.proposal_number}</td>
                                        <td className="p-3 font-medium">{quote.clientName}</td>
                                        <td className="p-3">{format(new Date(quote.created_at), 'dd/MM/yyyy')}</td>
                                        <td className="p-3 text-right font-mono">R$ {(quote.total_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                        <td className="p-3 text-center">
                                            <span className={`inline-flex items-center gap-x-1.5 px-2 py-1 text-xs font-medium rounded-full capitalize ${getStatusClass(quote.status)}`}>
                                                {quote.status}
                                            </span>
                                        </td>
                                        <td className="p-3 text-right">
                                            <div className="flex gap-2 justify-end">
                                                <Button size="sm" variant="ghost" onClick={() => navigate(`/cotacoes/editar/${quote.id}`)} className="text-slate-400 hover:text-blue-400"><Edit className="w-4 h-4" /></Button>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button size="sm" variant="ghost" className="text-slate-400 hover:text-red-400"><Trash2 className="w-4 h-4" /></Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent className="glass-effect border-slate-700 text-slate-200">
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle className="flex items-center text-slate-100"><Trash2 className="w-5 h-5 mr-2 text-red-400"/>Confirmar Exclusão</AlertDialogTitle>
                                                            <AlertDialogDescription className="text-slate-400">Tem certeza que deseja excluir a cotação Nº {quote.proposal_number}? Esta ação não pode ser desfeita.</AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDelete(quote.id, quote.proposal_number)} className="bg-red-500 hover:bg-red-600">Excluir</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredQuotes.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="p-8 text-center text-slate-500">
                                            <FileText className="w-12 h-12 mx-auto mb-2" />
                                            Nenhuma cotação encontrada.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </motion.div>
            </div>
        );
    };
    
    export default Quotes;