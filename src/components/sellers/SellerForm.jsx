import React, { useState, useEffect } from 'react';
    import { motion } from 'framer-motion';
    import { Button } from '@/components/ui/button';
    import { Input } from '@/components/ui/input';
    import InputWithMask from '@/components/ui/masked-input';
    import { Label } from '@/components/ui/label';
    import { Checkbox } from '@/components/ui/checkbox';
    import { validateCpf, MASKS } from '@/lib/masks';
    import { useToast } from '@/components/ui/use-toast';
    import { useData } from '@/contexts/SupabaseDataContext';
    import AddressForm from '@/components/clients/AddressForm';
    
    const initialFormData = {
      cod: '',
      nome: '',
      cpf: '',
      email: '',
      telefone: '',
      endereco: {
        logradouro: '',
        numero: '',
        bairro: '',
        cidade: '',
        uf: '',
        cep: '',
      },
      companyIds: [],
    };
    
    export default function SellerForm({ seller, onSave, onCancel }) {
      const [formData, setFormData] = useState(initialFormData);
      const { companies } = useData();
      const { toast } = useToast();
    
      useEffect(() => {
        if (seller) {
          const sellerData = {
            ...initialFormData,
            ...seller,
            endereco: seller.endereco || initialFormData.endereco,
            companyIds: seller.companyIds || [],
          };
          setFormData(sellerData);
        } else {
          setFormData(initialFormData);
        }
      }, [seller]);
    
      const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
      };
    
      const handleAddressChange = (index, field, value) => {
        const newAddress = { ...formData.endereco };
        if (field) {
          newAddress[field] = value;
        } else {
          Object.assign(newAddress, value);
        }
        setFormData({ ...formData, endereco: newAddress });
      };
    
      const handleCompanyChange = (companyId) => {
        setFormData(prev => {
          const newCompanyIds = prev.companyIds.includes(companyId)
            ? prev.companyIds.filter(id => id !== companyId)
            : [...prev.companyIds, companyId];
          return { ...prev, companyIds: newCompanyIds };
        });
      };
    
      const handleSubmit = (e) => {
        e.preventDefault();
        if (formData.cpf && !validateCpf(formData.cpf)) {
          toast({ variant: 'destructive', title: 'CPF inválido', description: 'O CPF informado não é válido.' });
          return;
        }
        if (!formData.nome || !formData.email) {
          toast({ variant: 'destructive', title: 'Campos obrigatórios', description: 'Nome e E-mail são obrigatórios.' });
          return;
        }
        onSave(formData);
      };
    
      return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-1">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-cyan-300 mb-4 border-b border-slate-700 pb-2">Dados do Vendedor</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="cod">Código</Label>
                  <Input id="cod" name="cod" value={formData.cod} onChange={handleInputChange} className="input-field" />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="name">Nome Completo</Label>
                  <Input id="name" name="nome" value={formData.nome} onChange={handleInputChange} className="input-field" required />
                </div>
                <div>
                  <Label htmlFor="cpf">CPF</Label>
                  <InputWithMask
                    id="cpf"
                    name="cpf"
                    mask={MASKS.cpf}
                    value={formData.cpf}
                    onChange={handleInputChange}
                    className="input-field"
                    required
                    placeholder="000.000.000-00"
                  />
                </div>
                <div>
                  <Label htmlFor="email">E-mail</Label>
                  <Input id="email" name="email" type="email" value={formData.email} onChange={handleInputChange} className="input-field" required />
                </div>
                <div>
                  <Label htmlFor="telefone">Telefone</Label>
                  <InputWithMask
                    id="telefone"
                    name="telefone"
                    mask={MASKS.phone}
                    value={formData.telefone}
                    onChange={handleInputChange}
                    className="input-field"
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>
            </div>
    
            <div>
              <h3 className="text-lg font-semibold text-cyan-300 mb-4 border-b border-slate-700 pb-2">Endereço</h3>
              <AddressForm
                address={formData.endereco}
                index={0}
                onAddressChange={handleAddressChange}
                personType="PF"
              />
            </div>
    
            <div>
              <h3 className="text-lg font-semibold text-cyan-300 mb-4 border-b border-slate-700 pb-2">Empresas Vinculadas</h3>
              <div className="space-y-2 p-4 rounded-lg bg-slate-900/50">
                {companies.length > 0 ? companies.map(company => (
                  <div key={company.id} className="flex items-center space-x-3">
                    <Checkbox
                      id={`company-${company.id}`}
                      checked={(formData.companyIds || []).includes(company.id)}
                      onCheckedChange={() => handleCompanyChange(company.id)}
                    />
                    <Label htmlFor={`company-${company.id}`} className="text-white/90 font-normal">
                      {company.name} ({company.fantasia})
                    </Label>
                  </div>
                )) : (
                  <p className="text-white/60">Nenhuma empresa cadastrada.</p>
                )}
              </div>
            </div>
    
            <div className="flex justify-end gap-4 pt-4">
              <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
              <Button type="submit" className="btn-primary">Salvar Vendedor</Button>
            </div>
          </form>
        </motion.div>
      );
    }