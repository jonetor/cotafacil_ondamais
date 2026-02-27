import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { User, Calendar, Plus, Briefcase } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useData } from '@/contexts/SupabaseDataContext';
import { useToast } from '@/components/ui/use-toast';
import ClientForm from '@/components/clients/ClientForm';

function QuoteClientForm({ formData, handleInputChange, handleSelectChange, clients, sellers }) {
  const { addClient } = useData();
  const { toast } = useToast();
  const [isClientDialogOpen, setIsClientDialogOpen] = useState(false);
  const selectedClient = clients.find(c => c.id === formData.clientId);

  const handleSaveNewClient = async (clientData) => {
    try {
        const newClient = await addClient(clientData);
        if (newClient) {
            toast({ title: "Cliente cadastrado!", description: "Novo cliente foi adicionado ao sistema." });
            handleSelectChange('clientId', newClient.id);
            setIsClientDialogOpen(false);
        }
    } catch(e) {
        // error is already toasted in context
    }
  };

  return (
    <div className="form-section">
      <h3 className="text-lg font-semibold text-white mb-4">Informações do Cliente e Vendedor</h3>
      <div className="space-y-4">
        <div>
          <Label htmlFor="client" className="text-white">Cliente</Label>
          <div className="flex items-center space-x-2">
            <Select onValueChange={(v) => handleSelectChange('clientId', v)} value={formData.clientId || ''}>
              <SelectTrigger className="input-field w-full">
                <User className="w-4 h-4 mr-2 text-white/60" />
                <SelectValue placeholder="Selecione um cliente" />
              </SelectTrigger>
              <SelectContent className="glass-effect border-white/20">
                {(clients || []).map((client) => (
                  <SelectItem key={client.id} value={client.id} className="text-white">
                    {client.nome_razao}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Dialog open={isClientDialogOpen} onOpenChange={setIsClientDialogOpen}>
              <DialogTrigger asChild>
                <Button type="button" variant="outline" size="icon" className="btn-secondary flex-shrink-0">
                  <Plus className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="glass-effect border-white/20 text-white max-w-5xl">
                <DialogHeader><DialogTitle className="text-white">Novo Cliente</DialogTitle></DialogHeader>
                <div className="max-h-[70vh] overflow-y-auto p-1">
                  <ClientForm onSave={handleSaveNewClient} onCancel={() => setIsClientDialogOpen(false)} />
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {selectedClient && selectedClient.tipo_pessoa === 'PJ' && (
          <div>
            <Label htmlFor="contactPerson" className="text-white">Aos Cuidados de</Label>
            <Input
              id="contactPerson"
              name="contactPerson"
              value={formData.contactPerson || ''}
              onChange={handleInputChange}
              className="input-field"
              placeholder="Nome do contato principal"
            />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="sellerId" className="text-white">Vendedor</Label>
            <Select onValueChange={(v) => handleSelectChange('sellerId', v)} value={formData.sellerId || ''}>
              <SelectTrigger className="input-field w-full">
                <Briefcase className="w-4 h-4 mr-2 text-white/60" />
                <SelectValue placeholder="Selecione um vendedor" />
              </SelectTrigger>
              <SelectContent className="glass-effect border-white/20">
                {(sellers || []).map((vendedor) => (
                  <SelectItem key={vendedor.id} value={vendedor.id} className="text-white">
                    {vendedor.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
           <div>
            <Label htmlFor="validUntil" className="text-white">Válida até</Label>
            <div className="relative">
               <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
              <Input
                id="validity_date"
                name="validity_date"
                type="date"
                value={formData.validity_date || ''}
                onChange={handleInputChange}
                className="input-field pl-10"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default QuoteClientForm;