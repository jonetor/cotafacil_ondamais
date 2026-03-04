import React, { useState, useEffect } from 'react';
    import { motion } from 'framer-motion';
    import { Button } from '@/components/ui/button';
    import { Input } from '@/components/ui/input';
    import InputWithMask from '@/components/ui/masked-input';
    import { Label } from '@/components/ui/label';
    import { validateCpf, MASKS } from '@/lib/masks';
    import { useToast } from '@/components/ui/use-toast';
    import { Plus } from 'lucide-react';
    import AddressForm from '@/components/clients/AddressForm';
    
    const initialFormData = {
      tipo_pessoa: 'PF',
      nome_razao: '',
      cpf_cnpj: '',
      rg: '',
      data_nascimento: '',
      email: '',
      telefone: '',
      enderecos: [],
      observacoes: '',
    };
    
    const initialAddress = {
      id: '',
      tipo_endereco: 'RESIDENCIAL',
      logradouro: '',
      numero: '',
      bairro: '',
      cidade: '',
      uf: '',
      cep: '',
      complemento: '',
      ibge: '',
      metadata: {}
    };
    
    function PeopleForm({ person, onSave, onCancel }) {
      const [formData, setFormData] = useState(initialFormData);
      const [step, setStep] = useState(1);
      const { toast } = useToast();
    
      useEffect(() => {
        if (person) {
          setFormData({ ...initialFormData, ...person });
        } else {
          setFormData(initialFormData);
        }
      }, [person]);
    
      const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
      };
      
      const handleAddressChange = (index, field, value) => {
        const newAddresses = [...formData.enderecos];
        if (field) {
            newAddresses[index][field] = value;
        } else {
            newAddresses[index] = { ...newAddresses[index], ...value };
        }
        setFormData({ ...formData, enderecos: newAddresses });
      };
      
      const addAddress = () => {
        setFormData({ ...formData, enderecos: [...formData.enderecos, { ...initialAddress, id: `addr_${Date.now()}` }] });
      };
    
      const removeAddress = (index) => {
        const newAddresses = formData.enderecos.filter((_, i) => i !== index);
        setFormData({ ...formData, enderecos: newAddresses });
      };
      
      const handleSubmit = (e) => {
        e.preventDefault();
        if (!validateCpf(formData.cpf_cnpj)) {
          toast({ variant: 'destructive', title: 'CPF inválido', description: 'O CPF informado não é válido.' });
          return;
        }
        if (formData.enderecos.length === 0) {
          toast({ variant: 'destructive', title: 'Endereço obrigatório', description: 'É necessário cadastrar ao menos um endereço.' });
          setStep(2);
          return;
        }
        onSave(formData);
      };
      
      const nextStep = () => setStep(s => Math.min(s + 1, 3));
      const prevStep = () => setStep(s => Math.max(s - 1, 1));
      
      return (
        <div className="p-4">
          <div className="flex items-center justify-center mb-6">
            <div className="flex items-center space-x-4">
              {[1, 2, 3].map(s => (
                <React.Fragment key={s}>
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300 ${step >= s ? 'bg-blue-500 border-blue-500 text-white' : 'bg-slate-700 border-slate-600 text-slate-400'}`}>
                    {s}
                  </div>
                  {s < 3 && <div className={`h-1 w-16 transition-all duration-300 ${step > s ? 'bg-blue-500' : 'bg-slate-600'}`}></div>}
                </React.Fragment>
              ))}
            </div>
          </div>
          
          <form onSubmit={handleSubmit}>
            {step === 1 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h3 className="text-lg font-semibold text-cyan-300 mb-4">Dados Pessoais</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label>Nome Completo</Label>
                    <Input name="nome_razao" value={formData.nome_razao} onChange={handleInputChange} className="input-field" required />
                  </div>
                  <div>
                    <Label>CPF</Label>
                    <InputWithMask
                        mask={MASKS.cpf}
                        name="cpf_cnpj"
                        value={formData.cpf_cnpj}
                        onChange={handleInputChange}
                        className="input-field"
                        required
                        placeholder="000.000.000-00"
                    />
                  </div>
                  <div>
                    <Label>RG</Label>
                    <Input name="rg" value={formData.rg} onChange={handleInputChange} className="input-field" />
                  </div>
                  <div>
                    <Label>Data de Nascimento</Label>
                    <Input name="data_nascimento" type="date" value={formData.data_nascimento} onChange={handleInputChange} className="input-field" />
                  </div>
                </div>
              </motion.div>
            )}
            
            {step === 2 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-cyan-300">Endereços</h3>
                  <Button type="button" onClick={addAddress} className="btn-secondary"><Plus className="w-4 h-4 mr-2" />Adicionar</Button>
                </div>
                <div className="space-y-4">
                  {formData.enderecos.map((addr, index) => (
                    <AddressForm key={addr.id || index} address={addr} index={index} onAddressChange={handleAddressChange} onRemoveAddress={removeAddress} personType="PF" />
                  ))}
                </div>
              </motion.div>
            )}
    
            {step === 3 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h3 className="text-lg font-semibold text-cyan-300 mb-4">Contatos e Observações</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><Label>Email</Label><Input name="email" type="email" value={formData.email} onChange={handleInputChange} className="input-field" /></div>
                    <div>
                        <Label>Telefone</Label>
                        <InputWithMask
                            mask={MASKS.phone}
                            name="telefone"
                            value={formData.telefone}
                            onChange={handleInputChange}
                            className="input-field"
                            placeholder="(00) 00000-0000"
                        />
                    </div>
                    <div className="md:col-span-2"><Label>Observações</Label><textarea name="observacoes" value={formData.observacoes} onChange={handleInputChange} rows={3} className="input-field w-full"></textarea></div>
                  </div>
              </motion.div>
            )}
            
            <div className="flex justify-between mt-6">
              <Button type="button" variant="ghost" onClick={step > 1 ? prevStep : onCancel}>{step > 1 ? 'Anterior' : 'Cancelar'}</Button>
              {step < 3 ? (
                <Button type="button" className="btn-primary" onClick={nextStep}>Próximo</Button>
              ) : (
                <Button type="submit" className="btn-primary">Salvar Pessoa</Button>
              )}
            </div>
          </form>
        </div>
      );
    }
    
    export default PeopleForm;