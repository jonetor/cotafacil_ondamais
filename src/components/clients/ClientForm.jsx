import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import InputWithMask from '@/components/ui/masked-input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { validateCnpj, validateCpf, MASKS } from '@/lib/masks';
import { useToast } from '@/components/ui/use-toast';
import { useData } from '@/contexts/SupabaseDataContext';
import { fetchCnpjData } from '@/services/ClientProvider';
import { Loader2, Search, ArrowRight, ArrowLeft, Plus, Info, CheckCircle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import AddressForm from './AddressForm';
import { buscarCep } from '@/api/cep';

const onlyDigits = (s) => String(s || '').replace(/\D/g, '');

const initialFormData = {
  tipo_pessoa: 'PJ',
  nome_razao: '',
  fantasia: '',
  cpf_cnpj: '',
  inscricao_estadual: '',
  isento_ie: false,
  rg: '',
  data_nascimento: '',
  situacao_cadastral: '',
  data_abertura: '',
  natureza_juridica: '',
  porte: '',
  cnae_principal: '',
  email: '',
  telefone: '',
  enderecos: [],
  observacoes: '',
  metadata: {},
};

const initialAddress = {
  id: '',
  tipo_endereco: 'FISCAL',
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

function ClientForm({ client, onSave, onCancel }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState(initialFormData);
  const [isFetchingDoc, setIsFetchingDoc] = useState(false);
  const [fetchedData, setFetchedData] = useState(null);
  const [isConfirmAlertOpen, setIsConfirmAlertOpen] = useState(false);
  const [isDuplicateAlertOpen, setIsDuplicateAlertOpen] = useState(false);
  const [duplicateClient, setDuplicateClient] = useState(null);

  const { toast } = useToast();
  const { clients, addClient } = useData();

  useEffect(() => {
    if (client) {
      const initial = { ...initialFormData, ...client };
      if (!Array.isArray(initial.enderecos) || initial.enderecos.length === 0) {
        initial.enderecos = [{ ...initialAddress, id: `addr_${Date.now()}` }];
      }
      setFormData(initial);
    } else {
      setFormData({ ...initialFormData, enderecos: [{ ...initialAddress, id: `addr_${Date.now()}` }] });
    }
  }, [client]);

  // ✅ CEP lookup via BFF (/api/cep/:cep)
  const handleCepLookup = async (addressIndex, cepValue) => {
    try {
      const data = await buscarCep(cepValue);
      if (!data) return;

      // atualiza endereço com retorno do ViaCEP
      handleAddressChange(addressIndex, null, {
        logradouro: data.logradouro || '',
        bairro: data.bairro || '',
        cidade: data.localidade || '',
        uf: data.uf || '',
        ibge: data.ibge || '',
        // mantém o cep (normalmente vem com hífen)
        cep: data.cep || cepValue,
        metadata: { ...(formData.enderecos[addressIndex]?.metadata || {}), viaCep: data }
      });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro ao buscar CEP',
        description: err?.message || 'Não foi possível consultar o CEP.'
      });
    }
  };

  const handleDocumentSearch = async () => {
    const docType = formData.tipo_pessoa;
    const cleanDoc = onlyDigits(formData.cpf_cnpj);

    const isValid = docType === 'PF' ? validateCpf(formData.cpf_cnpj) : validateCnpj(formData.cpf_cnpj);
    if (!isValid) {
      toast({
        variant: 'destructive',
        title: 'Documento inválido',
        description: `O ${docType} informado não possui um formato ou dígito verificador válido.`
      });
      return;
    }

    const existingClient = (clients || []).find(c => onlyDigits(c?.cpf_cnpj) === cleanDoc);
    if (existingClient && (!client || existingClient.id !== client.id)) {
      setDuplicateClient(existingClient);
      setIsDuplicateAlertOpen(true);
      return;
    }

    if (docType === 'PF') {
      toast({
        title: 'Aviso',
        description: 'Para proteger dados pessoais (LGPD), a busca automática de CPF não está disponível. Por favor, preencha os dados manualmente.'
      });
      return;
    }

    // ✅ proteção extra (evita “CNPJ não fornecido”)
    if (cleanDoc.length !== 14) {
      toast({
        variant: 'destructive',
        title: 'CNPJ inválido',
        description: 'Informe um CNPJ com 14 dígitos.'
      });
      return;
    }

    setIsFetchingDoc(true);
    try {
      // se seu ClientProvider esperar string, isso funciona.
      // se ele esperar { cnpj }, ajuste lá para aceitar string também (eu te passo depois).
      const data = await fetchCnpjData(cleanDoc);

      const mappedData = {
        nome_razao: data?.razao_social || '',
        fantasia: data?.nome_fantasia || '',
        cpf_cnpj: data?.cnpj || formData.cpf_cnpj,
        data_abertura: data?.data_inicio_atividade || '',
        porte: data?.porte || '',
        natureza_juridica: data?.cnae_fiscal_descricao || '',
        enderecos: [{
          ...initialAddress,
          id: `addr_${Date.now()}`,
          logradouro: data?.logradouro || '',
          numero: data?.numero || '',
          complemento: data?.complemento || '',
          bairro: data?.bairro || '',
          cidade: data?.municipio || '',
          uf: data?.uf || '',
          cep: data?.cep || '',
        }],
        email: data?.email || '',
        telefone: data?.ddd_telefone_1 || data?.ddd_telefone_2 || '',
        situacao_cadastral: data?.descricao_situacao_cadastral || '',
        cnae_principal: data?.cnae_fiscal ? `${data.cnae_fiscal} - ${data.cnae_fiscal_descricao || ''}` : '',
      };

      setFetchedData(mappedData);
      setIsConfirmAlertOpen(true);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao buscar CNPJ',
        description: error?.message || 'Não foi possível encontrar os dados. Verifique o CNPJ e tente novamente.',
      });
    } finally {
      setIsFetchingDoc(false);
    }
  };

  const handleConfirmFetchedData = () => {
    setFormData(prev => ({
      ...prev,
      ...fetchedData,
      metadata: { source: 'BrasilAPI', timestamp: new Date().toISOString() }
    }));
    setIsConfirmAlertOpen(false);
    setFetchedData(null);
    toast({ title: 'Dados preenchidos!', description: 'O formulário foi preenchido com os dados da Receita Federal.' });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!Array.isArray(formData.enderecos) || formData.enderecos.length === 0) {
      toast({ variant: 'destructive', title: 'Endereço obrigatório', description: 'É necessário cadastrar ao menos um endereço.' });
      setStep(2);
      return;
    }
    onSave(formData);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
  };

  const handleTypeChange = (value) => {
    const newFormData = { ...initialFormData, tipo_pessoa: value };
    const tipoEndereco = value === 'PF' ? 'RESIDENCIAL' : 'FISCAL';
    newFormData.enderecos = [{ ...initialAddress, tipo_endereco: tipoEndereco, id: `addr_${Date.now()}` }];
    setFormData(newFormData);
  };

  const handleAddressChange = (index, field, value) => {
    const newAddresses = [...(formData.enderecos || [])];

    if (field) {
      newAddresses[index] = { ...newAddresses[index], [field]: value };
    } else {
      newAddresses[index] = { ...newAddresses[index], ...value };
    }

    setFormData({ ...formData, enderecos: newAddresses });
  };

  const addAddress = () => {
    const defaultType = formData.tipo_pessoa === 'PF' ? 'RESIDENCIAL' : 'FISCAL';
    setFormData({
      ...formData,
      enderecos: [...formData.enderecos, { ...initialAddress, tipo_endereco: defaultType, id: `addr_${Date.now()}` }]
    });
  };

  const removeAddress = (index) => {
    const newAddresses = formData.enderecos.filter((_, i) => i !== index);
    setFormData({ ...formData, enderecos: newAddresses });
  };

  const nextStep = () => setStep(s => Math.min(s + 1, 3));
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  const handleUpdateAndContinue = async () => {
    const dataToSave = { ...formData, id: duplicateClient.id };
    await addClient(dataToSave);
    setIsDuplicateAlertOpen(false);
    toast({ title: 'Cliente atualizado!', description: 'Os dados do cliente existente foram atualizados.' });
    onSave(dataToSave);
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-6">
      <div className="flex items-center space-x-4">
        {['Identificação', 'Endereços', 'Contatos'].map((label, index) => {
          const s = index + 1;
          return (
            <React.Fragment key={s}>
              <div className="flex flex-col items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300 ${step >= s ? 'bg-blue-500 border-blue-500 text-white' : 'bg-slate-700 border-slate-600 text-slate-400'}`}>
                  {s}
                </div>
                <p className={`text-xs mt-2 transition-colors duration-300 ${step >= s ? 'text-slate-200' : 'text-slate-400'}`}>{label}</p>
              </div>
              {s < 3 && <div className={`h-1 w-16 transition-all duration-300 ${step > s ? 'bg-blue-500' : 'bg-slate-600'}`}></div>}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );

  return (
    <>
      {renderStepIndicator()}

      <form onSubmit={handleSubmit}>
        <div className="space-y-4 mt-4 max-h-[60vh] overflow-y-auto p-1 -m-1">
          {step === 1 && (
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Tipo de Pessoa</Label>
                  <Select onValueChange={handleTypeChange} value={formData.tipo_pessoa}>
                    <SelectTrigger className="input-field"><SelectValue /></SelectTrigger>
                    <SelectContent className="glass-effect border-slate-700">
                      <SelectItem value="PJ">Pessoa Jurídica (PJ)</SelectItem>
                      <SelectItem value="PF">Pessoa Física (PF)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="md:col-span-2">
                  <Label>{formData.tipo_pessoa === 'PF' ? 'CPF' : 'CNPJ'}</Label>
                  <div className="flex items-center space-x-2">
                    <InputWithMask
                      mask={formData.tipo_pessoa === 'PF' ? MASKS.cpf : MASKS.cnpj}
                      name="cpf_cnpj"
                      value={formData.cpf_cnpj}
                      onChange={handleInputChange}
                      className="input-field"
                      placeholder={formData.tipo_pessoa === 'PF' ? '000.000.000-00' : '00.000.000/0000-00'}
                    />

                    {formData.tipo_pessoa === 'PJ' && (
                      <Button
                        type="button"
                        onClick={handleDocumentSearch}
                        disabled={isFetchingDoc || !formData.cpf_cnpj}
                        className="btn-secondary px-3"
                      >
                        {isFetchingDoc ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                        <span className="ml-2 hidden sm:inline">Buscar</span>
                      </Button>
                    )}
                  </div>
                </div>

                <div className="md:col-span-3">
                  <Label>{formData.tipo_pessoa === 'PF' ? 'Nome Completo' : 'Razão Social'}</Label>
                  <Input name="nome_razao" value={formData.nome_razao} onChange={handleInputChange} className="input-field" required />
                </div>

                {formData.tipo_pessoa === 'PJ' ? (
                  <>
                    <div className="md:col-span-3">
                      <Label>Nome Fantasia</Label>
                      <Input name="fantasia" value={formData.fantasia} onChange={handleInputChange} className="input-field" />
                    </div>

                    <div>
                      <Label>Inscrição Estadual</Label>
                      <Input
                        name="inscricao_estadual"
                        value={formData.inscricao_estadual}
                        onChange={handleInputChange}
                        className="input-field"
                        disabled={formData.isento_ie}
                      />
                    </div>

                    <div className="flex items-center pt-6 space-x-2">
                      <Checkbox
                        id="isento_ie"
                        checked={!!formData.isento_ie}
                        onCheckedChange={(c) => {
                          const checked = c === true;
                          setFormData({ ...formData, isento_ie: checked, inscricao_estadual: checked ? 'ISENTO' : '' });
                        }}
                      />
                      <Label htmlFor="isento_ie">Isento de IE</Label>
                    </div>

                    <div className="flex items-center pt-6">
                      <Label className="mr-2">Situação:</Label>
                      <span className={`font-semibold ${formData.situacao_cadastral === 'ATIVA' ? 'text-green-400' : 'text-yellow-400'}`}>
                        {formData.situacao_cadastral || 'N/A'}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div><Label>RG</Label><Input name="rg" value={formData.rg} onChange={handleInputChange} className="input-field" /></div>
                    <div><Label>Data de Nascimento</Label><Input name="data_nascimento" type="date" value={formData.data_nascimento} onChange={handleInputChange} className="input-field" /></div>
                  </>
                )}
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-cyan-300">Endereços</h3>
                <Button type="button" onClick={addAddress} className="btn-secondary">
                  <Plus className="w-4 h-4 mr-2" />Adicionar Endereço
                </Button>
              </div>

              <div className="space-y-6">
                {formData.enderecos.map((addr, index) => (
                  <AddressForm
                    key={addr.id || index}
                    address={addr}
                    index={index}
                    onAddressChange={handleAddressChange}
                    onRemoveAddress={formData.enderecos.length > 1 ? removeAddress : null}
                    personType={formData.tipo_pessoa}
                    // ✅ NOVO: lookup de CEP via BFF
                    onCepLookup={(cep) => handleCepLookup(index, cep)}
                  />
                ))}
                {formData.enderecos.length === 0 && (
                  <p className="text-center text-slate-400 py-8">Nenhum endereço cadastrado. Clique em "Adicionar Endereço".</p>
                )}
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label>Email Principal</Label><Input name="email" type="email" value={formData.email} onChange={handleInputChange} className="input-field" /></div>
                <div>
                  <Label>Telefone Principal</Label>
                  <InputWithMask
                    mask={MASKS.phone}
                    name="telefone"
                    value={formData.telefone}
                    onChange={handleInputChange}
                    className="input-field"
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Observações</Label>
                  <textarea name="observacoes" value={formData.observacoes} onChange={handleInputChange} rows={4} className="input-field w-full"></textarea>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        <div className="flex justify-between items-center pt-6 mt-4 border-t border-slate-700">
          <div>
            {step > 1 && <Button type="button" variant="ghost" onClick={prevStep}><ArrowLeft className="w-4 h-4 mr-2" />Anterior</Button>}
          </div>
          <div className="flex items-center space-x-2">
            <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
            {step < 3 && <Button type="button" className="btn-primary" onClick={nextStep}>Próximo<ArrowRight className="w-4 h-4 ml-2" /></Button>}
            {step === 3 && <Button type="submit" className="btn-primary">{client ? 'Atualizar Cliente' : 'Salvar Cliente'}</Button>}
          </div>
        </div>
      </form>

      <AlertDialog open={isConfirmAlertOpen} onOpenChange={setIsConfirmAlertOpen}>
        <AlertDialogContent className="glass-effect border-slate-700 text-slate-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center"><CheckCircle className="mr-2 h-5 w-5 text-green-400" />Dados Encontrados</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Encontramos os seguintes dados para o CNPJ informado. Deseja preencher o formulário com estas informações?
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="text-sm space-y-1 max-h-60 overflow-y-auto pr-2">
            {fetchedData?.nome_razao && <p><strong>Razão Social:</strong> {fetchedData.nome_razao}</p>}
            {fetchedData?.fantasia && <p><strong>Nome Fantasia:</strong> {fetchedData.fantasia}</p>}
            {fetchedData?.enderecos?.[0] && <p><strong>Endereço:</strong> {`${fetchedData.enderecos[0].logradouro}, ${fetchedData.enderecos[0].numero || 'S/N'}`}</p>}
            {fetchedData?.email && <p><strong>Email:</strong> {fetchedData.email || 'N/A'}</p>}
            {fetchedData?.telefone && <p><strong>Telefone:</strong> {fetchedData.telefone || 'N/A'}</p>}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Não, obrigado</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmFetchedData} className="btn-primary">Confirmar e Preencher</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isDuplicateAlertOpen} onOpenChange={setIsDuplicateAlertOpen}>
        <AlertDialogContent className="glass-effect border-slate-700 text-slate-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center"><Info className="mr-2 h-5 w-5 text-yellow-400" />Cliente Duplicado</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Já existe um cliente cadastrado com este documento: <strong className="text-amber-400">{duplicateClient?.nome_razao}</strong>.
              <br />
              Deseja atualizar os dados existentes com as informações que você preencheu ou cancelar a operação?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDuplicateAlertOpen(false)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleUpdateAndContinue} className="btn-primary">Atualizar e Continuar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default ClientForm;