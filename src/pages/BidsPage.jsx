import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash2, Gavel, MoreVertical, FileText, Building, Calendar, AlertTriangle } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const initialFormData = {
  processNumber: '',
  modality: '',
  publicAgency: '',
  object: '',
  applicableLaw: '14.133/21',
  deadline: '',
  status: 'em_andamento',
};

function BidsPage() {
  const { bids, addBid, updateBid, deleteBid } = useData();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBid, setEditingBid] = useState(null);
  const [formData, setFormData] = useState(initialFormData);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingBid) {
      updateBid(editingBid.id, formData);
      toast({ title: "Licitação atualizada!", description: "Os dados foram atualizados com sucesso." });
    } else {
      addBid(formData);
      toast({ title: "Licitação cadastrada!", description: "Novo processo licitatório adicionado." });
    }
    resetForm();
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setEditingBid(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (bid) => {
    setEditingBid(bid);
    setFormData({ ...initialFormData, ...bid });
    setIsDialogOpen(true);
  };
  
  const handleDelete = (id) => {
    deleteBid(id);
    toast({ title: "Licitação removida!", description: "O processo foi removido do sistema." });
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  
  const getStatusInfo = (status) => {
    switch (status) {
      case 'em_andamento': return { text: 'Em Andamento', bg: 'bg-blue-500/20', color: 'text-blue-300' };
      case 'homologado': return { text: 'Homologado', bg: 'bg-green-500/20', color: 'text-green-300' };
      case 'inabilitado': return { text: 'Inabilitado', bg: 'bg-red-500/20', color: 'text-red-300' };
      case 'recurso': return { text: 'Em Recurso', bg: 'bg-yellow-500/20', color: 'text-yellow-300' };
      default: return { text: 'Desconhecido', bg: 'bg-slate-500/20', color: 'text-slate-300' };
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Licitações</h1>
          <p className="text-white/60">Gerencie seus processos licitatórios</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(isOpen) => { if (!isOpen) resetForm(); setIsDialogOpen(isOpen); }}>
          <DialogTrigger asChild>
            <Button className="btn-primary"><Plus className="w-4 h-4 mr-2" />Novo Processo</Button>
          </DialogTrigger>
          <DialogContent className="glass-effect border-white/20 text-white max-w-3xl">
            <DialogHeader><DialogTitle className="text-white">{editingBid ? 'Editar Licitação' : 'Nova Licitação'}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2"><Label>Nº do Processo</Label><Input name="processNumber" value={formData.processNumber} onChange={handleInputChange} className="input-field" required /></div>
                <div><Label>Modalidade</Label><Input name="modality" value={formData.modality} onChange={handleInputChange} className="input-field" placeholder="Ex: Pregão Eletrônico" /></div>
                <div><Label>Órgão Público</Label><Input name="publicAgency" value={formData.publicAgency} onChange={handleInputChange} className="input-field" /></div>
                <div className="md:col-span-2"><Label>Objeto</Label><Input name="object" value={formData.object} onChange={handleInputChange} className="input-field" /></div>
                <div><Label>Lei Aplicável</Label><Select name="applicableLaw" onValueChange={(v) => setFormData({...formData, applicableLaw: v})} value={formData.applicableLaw}><SelectTrigger className="input-field"><SelectValue /></SelectTrigger><SelectContent className="glass-effect"><SelectItem value="14.133/21">Lei 14.133/21</SelectItem><SelectItem value="8.666/93">Lei 8.666/93</SelectItem></SelectContent></Select></div>
                <div><Label>Prazo Final</Label><Input name="deadline" type="date" value={formData.deadline} onChange={handleInputChange} className="input-field" /></div>
                <div className="md:col-span-2"><Label>Status</Label><Select name="status" onValueChange={(v) => setFormData({...formData, status: v})} value={formData.status}><SelectTrigger className="input-field"><SelectValue /></SelectTrigger><SelectContent className="glass-effect"><SelectItem value="em_andamento">Em Andamento</SelectItem><SelectItem value="homologado">Homologado</SelectItem><SelectItem value="inabilitado">Inabilitado</SelectItem><SelectItem value="recurso">Em Recurso</SelectItem></SelectContent></Select></div>
              </div>
              <div className="flex justify-end space-x-4 pt-4">
                <Button type="button" variant="ghost" onClick={resetForm}>Cancelar</Button>
                <Button type="submit" className="btn-primary">{editingBid ? 'Atualizar' : 'Cadastrar'}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="space-y-4">
        {bids.length > 0 ? bids.map((bid, index) => {
          const statusInfo = getStatusInfo(bid.status);
          const isExpired = bid.deadline && new Date(bid.deadline) < new Date();
          return (
          <motion.div key={bid.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} className="floating-card card-hover">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
              <div className="flex items-center space-x-4 flex-1 min-w-0 mb-4 md:mb-0">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0"><Gavel className="w-6 h-6 text-white" /></div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-white truncate">{bid.processNumber}</h3>
                  <p className="text-white/80 text-sm truncate">{bid.object}</p>
                  <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-white/60 text-sm mt-1">
                    <div className="flex items-center space-x-1"><Building className="w-4 h-4" /><span>{bid.publicAgency}</span></div>
                    <div className="flex items-center space-x-1"><FileText className="w-4 h-4" /><span>{bid.modality}</span></div>
                    {bid.deadline && (
                      <div className={`flex items-center space-x-1 ${isExpired ? 'text-red-400' : ''}`}>
                          <Calendar className="w-4 h-4" /><span>Prazo: {new Date(bid.deadline).toLocaleDateString('pt-BR')}</span>
                          {isExpired && <AlertTriangle className="w-4 h-4 ml-1" />}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-4 w-full md:w-auto">
                <span className={`status-badge ${statusInfo.bg} ${statusInfo.color}`}>{statusInfo.text}</span>
                <div className="flex-grow md:flex-grow-0"></div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="text-white/60 hover:text-white"><MoreVertical className="w-5 h-5" /></Button></DropdownMenuTrigger>
                  <DropdownMenuContent className="glass-effect border-white/20 text-white">
                    <DropdownMenuItem onClick={() => handleEdit(bid)}><Edit className="w-4 h-4 mr-2" />Editar</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => toast({ title: "Funcionalidade em desenvolvimento" })}><FileText className="w-4 h-4 mr-2" />Gerenciar Documentos</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => toast({ title: "Funcionalidade em desenvolvimento" })}><AlertTriangle className="w-4 h-4 mr-2" />Ver Alertas</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDelete(bid.id)} className="text-red-400 focus:text-red-300"><Trash2 className="w-4 h-4 mr-2" />Excluir</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </motion.div>
        )}) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
            <Gavel className="w-16 h-16 text-white/30 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Nenhum processo licitatório encontrado</h3>
            <p className="text-white/60 mb-6">Comece cadastrando seu primeiro processo</p>
            <Button onClick={() => setIsDialogOpen(true)} className="btn-primary"><Plus className="w-4 h-4 mr-2" />Novo Processo</Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default BidsPage;