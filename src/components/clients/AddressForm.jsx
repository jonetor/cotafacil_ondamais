import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import InputWithMask from '@/components/ui/masked-input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { MASKS } from '@/lib/masks';

function AddressForm({
  address,
  index,
  onAddressChange,
  onRemoveAddress,
  personType,
  onCepLookup, // ✅ NOVO (vem do ClientForm)
}) {
  const [localAddress, setLocalAddress] = useState(address);
  const [isFetchingCep, setIsFetchingCep] = useState(false);
  const [source, setSource] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    setLocalAddress(address);
  }, [address]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const newAddress = { ...localAddress, [name]: value };
    setLocalAddress(newAddress);
    onAddressChange(index, name, value);
  };

  const handleSelectChange = (field, value) => {
    const newAddress = { ...localAddress, [field]: value };
    setLocalAddress(newAddress);
    onAddressChange(index, field, value);
  };

  // ✅ Agora o lookup do CEP é feito pelo pai (ClientForm) via BFF
  const handleCepBlur = useCallback(async (e) => {
    const cep = e.target.value;
    const cleanCep = String(cep || '').replace(/\D/g, '');

    if (cleanCep.length !== 8) {
      if (cleanCep.length > 0) {
        toast({ variant: 'destructive', title: 'CEP Inválido', description: 'O CEP deve conter 8 dígitos.' });
      }
      return;
    }

    if (typeof onCepLookup !== 'function') {
      toast({
        variant: 'destructive',
        title: 'Configuração ausente',
        description: 'Função de busca de CEP não foi configurada (onCepLookup).',
      });
      return;
    }

    setIsFetchingCep(true);
    setSource(null);

    try {
      // chama o pai. O pai atualiza o endereço via onAddressChange(...)
      await onCepLookup(cep);

      // marca fonte (o pai já preencheu os campos)
      setSource('ViaCEP (via BFF)');
      toast({ title: 'CEP consultado!', description: 'Se encontrado, o endereço foi preenchido automaticamente.' });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao buscar CEP',
        description: error?.message || 'Não foi possível buscar o CEP.',
      });
    } finally {
      setIsFetchingCep(false);
    }
  }, [onCepLookup, toast]);

  const addressTypes = personType === 'PJ'
    ? [{ value: 'FISCAL', label: 'Fiscal' }, { value: 'ENTREGA', label: 'Entrega' }, { value: 'COBRANCA', label: 'Cobrança' }]
    : [{ value: 'RESIDENCIAL', label: 'Residencial' }, { value: 'COMERCIAL', label: 'Comercial' }];

  return (
    <div className="p-4 rounded-lg bg-slate-800/60 border border-slate-700/50 relative">
      <div className="flex justify-between items-start mb-4">
        <h4 className="text-md font-semibold text-cyan-400">Endereço {index + 1}</h4>
        {onRemoveAddress && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-red-400 hover:text-red-300 -mt-2 -mr-2"
            onClick={() => onRemoveAddress(index)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2">
          <Label>Tipo</Label>
          <Select onValueChange={(v) => handleSelectChange('tipo_endereco', v)} value={localAddress.tipo_endereco}>
            <SelectTrigger className="input-field"><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
            <SelectContent className="glass-effect">
              {addressTypes.map(type => (
                <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="md:col-span-2 relative">
          <Label>CEP</Label>
          <div className="relative flex items-center">
            <InputWithMask
              mask={MASKS.cep}
              name="cep"
              value={localAddress.cep || ''}
              onChange={handleChange}
              onBlur={handleCepBlur}
              className="input-field"
              placeholder="00000-000"
            />
            {isFetchingCep && <Loader2 className="absolute right-3 h-4 w-4 animate-spin text-cyan-400" />}
          </div>
          {source && <Badge variant="secondary" className="absolute -bottom-5 left-0 text-xs">Fonte: {source}</Badge>}
        </div>

        <div className="md:col-span-3">
          <Label>Logradouro</Label>
          <Input name="logradouro" value={localAddress.logradouro || ''} onChange={handleChange} className="input-field" />
        </div>

        <div>
          <Label>Número</Label>
          <Input name="numero" value={localAddress.numero || ''} onChange={handleChange} className="input-field" />
        </div>

        <div className="md:col-span-2">
          <Label>Bairro</Label>
          <Input name="bairro" value={localAddress.bairro || ''} onChange={handleChange} className="input-field" />
        </div>

        <div className="md:col-span-2">
          <Label>Complemento</Label>
          <Input name="complemento" value={localAddress.complemento || ''} onChange={handleChange} className="input-field" />
        </div>

        <div className="md:col-span-2">
          <Label>Cidade</Label>
          <Input name="cidade" value={localAddress.cidade || ''} onChange={handleChange} className="input-field" />
        </div>

        <div>
          <Label>UF</Label>
          <Input name="uf" value={localAddress.uf || ''} onChange={handleChange} className="input-field" maxLength={2} />
        </div>

        <div>
          <Label>Cód. IBGE</Label>
          <Input name="ibge" value={localAddress.ibge || ''} onChange={handleChange} className="input-field" />
        </div>
      </div>
    </div>
  );
}

export default AddressForm;