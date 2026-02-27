import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Package, Wrench, Wifi } from 'lucide-react';
import { useData } from '@/contexts/SupabaseDataContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const ProductTypeSelection = ({ onSelect }) => (
  <div>
    <DialogHeader className="text-center">
      <DialogTitle className="text-slate-100 text-xl">Novo Item</DialogTitle>
      <DialogDescription className="text-slate-400">Selecione o tipo de item que deseja cadastrar.</DialogDescription>
    </DialogHeader>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-6">
      <Button variant="outline" className="h-28 flex-col gap-2 text-slate-300 hover:bg-slate-800 hover:border-cyan-500 hover:text-cyan-400 transition-all duration-200 border-slate-700" onClick={() => onSelect('PRODUTO')}>
        <Package className="w-8 h-8 text-cyan-400" />
        <span className="font-semibold">Produto</span>
      </Button>
      <Button variant="outline" className="h-28 flex-col gap-2 text-slate-300 hover:bg-slate-800 hover:border-purple-500 hover:text-purple-400 transition-all duration-200 border-slate-700" onClick={() => onSelect('SERVICO')}>
        <Wrench className="w-8 h-8 text-purple-400" />
        <span className="font-semibold">Serviço</span>
      </Button>
      <Button variant="outline" className="h-28 flex-col gap-2 text-slate-300 hover:bg-slate-800 hover:border-amber-500 hover:text-amber-400 transition-all duration-200 border-slate-700" onClick={() => onSelect('SERVICO_SCM')}>
        <Wifi className="w-8 h-8 text-amber-400" />
        <span className="font-semibold">Serviço SCM</span>
      </Button>
    </div>
  </div>
);

const ProductForm = ({ type, formData, setFormData, companies }) => {
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleNumberChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (value) => {
    setFormData(prev => ({...prev, empresa_id: value}));
  }

  const title = {
    PRODUTO: 'Cadastrar Produto',
    SERVICO: 'Cadastrar Serviço',
    SERVICO_SCM: 'Cadastrar Serviço SCM',
  }[type];

  return (
    <div>
      <DialogHeader>
        <DialogTitle className="text-slate-100">{title}</DialogTitle>
        <DialogDescription className="text-slate-400">Preencha os campos abaixo.</DialogDescription>
      </DialogHeader>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 py-6 max-h-[60vh] overflow-y-auto p-1">
        <div className="md:col-span-4">
          <Label htmlFor="empresa_id">Empresa</Label>
          <Select onValueChange={handleSelectChange} value={formData.empresa_id || ''}>
            <SelectTrigger className="input-field">
              <SelectValue placeholder="Selecione a empresa" />
            </SelectTrigger>
            <SelectContent>
              {companies.map(company => (
                <SelectItem key={company.id} value={company.id}>{company.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-1"><Label htmlFor="cod">Código</Label><Input id="cod" name="cod" value={formData.cod || ''} onChange={handleChange} className="input-field" /></div>
        <div className="md:col-span-3"><Label htmlFor="description">Descrição</Label><Input id="description" name="description" value={formData.description || ''} onChange={handleChange} className="input-field" /></div>
        
        {type === 'PRODUTO' && (
          <>
            <div className="md:col-span-1"><Label htmlFor="unit">Unidade</Label><Input id="unit" name="unit" value={formData.unit || ''} onChange={handleChange} className="input-field" /></div>
            <div className="md:col-span-1"><Label htmlFor="icms">ICMS (%)</Label><Input id="icms" name="icms" type="number" value={formData.icms || ''} onChange={handleNumberChange} className="input-field" /></div>
            <div className="md:col-span-1"><Label htmlFor="pis">PIS (%)</Label><Input id="pis" name="pis" type="number" value={formData.pis || ''} onChange={handleNumberChange} className="input-field" /></div>
            <div className="md:col-span-1"><Label htmlFor="cofins">COFINS (%)</Label><Input id="cofins" name="cofins" type="number" value={formData.cofins || ''} onChange={handleNumberChange} className="input-field" /></div>
            <div className="md:col-span-2"><Label htmlFor="purchase_price">Valor de Compra</Label><Input id="purchase_price" name="purchase_price" type="number" value={formData.purchase_price || ''} onChange={handleNumberChange} className="input-field" /></div>
            <div className="md:col-span-2"><Label htmlFor="sale_price">Valor de Venda</Label><Input id="sale_price" name="sale_price" type="number" value={formData.sale_price || ''} onChange={handleNumberChange} className="input-field" /></div>
          </>
        )}

        {type === 'SERVICO' && (
          <>
            <div className="md:col-span-1"><Label htmlFor="issqn">ISSQN (%)</Label><Input id="issqn" name="issqn" type="number" value={formData.issqn || ''} onChange={handleNumberChange} className="input-field" /></div>
            <div className="md:col-span-1"><Label htmlFor="pis">PIS (%)</Label><Input id="pis" name="pis" type="number" value={formData.pis || ''} onChange={handleNumberChange} className="input-field" /></div>
            <div className="md:col-span-1"><Label htmlFor="cofins">COFINS (%)</Label><Input id="cofins" name="cofins" type="number" value={formData.cofins || ''} onChange={handleNumberChange} className="input-field" /></div>
            <div className="md:col-span-1"><Label htmlFor="sale_price">Valor do Serviço</Label><Input id="sale_price" name="sale_price" type="number" value={formData.sale_price || ''} onChange={handleNumberChange} className="input-field" /></div>
          </>
        )}

        {type === 'SERVICO_SCM' && (
          <>
            <div className="md:col-span-1"><Label htmlFor="icms">ICMS (%)</Label><Input id="icms" name="icms" type="number" value={formData.icms || ''} onChange={handleNumberChange} className="input-field" /></div>
            <div className="md:col-span-1"><Label htmlFor="pis">PIS (%)</Label><Input id="pis" name="pis" type="number" value={formData.pis || ''} onChange={handleNumberChange} className="input-field" /></div>
            <div className="md:col-span-1"><Label htmlFor="cofins">COFINS (%)</Label><Input id="cofins" name="cofins" type="number" value={formData.cofins || ''} onChange={handleNumberChange} className="input-field" /></div>
            <div className="md:col-span-1"><Label htmlFor="sale_price">Valor do Serviço</Label><Input id="sale_price" name="sale_price" type="number" value={formData.sale_price || ''} onChange={handleNumberChange} className="input-field" /></div>
          </>
        )}
      </div>
    </div>
  );
};

export default function ProductCreateDialog({ open, onOpenChange, product, onSave }) {
  const { companies } = useData();
  const [type, setType] = useState(null);
  const [formData, setFormData] = useState({});

  const getInitialData = (productData, productType) => {
    const defaults = {
      id: productData?.id || null,
      type: productType,
      cod: '',
      description: '',
      unit: 'UN',
      icms: '',
      pis: '',
      cofins: '',
      purchase_price: '',
      sale_price: '',
      issqn: '',
      empresa_id: productData?.empresa_id || companies[0]?.id || null,
    };
    const combinedData = { ...defaults, ...productData };
    return combinedData;
  };
  
  useEffect(() => {
    if (open) {
      if (product) {
        const productType = product.type || product.tipo;
        setType(productType);
        setFormData(getInitialData(product, productType));
      } else {
        setType(null);
        setFormData({});
      }
    }
  }, [open, product, companies]);

  const handleTypeSelect = (selectedType) => {
    setType(selectedType);
    setFormData(getInitialData(null, selectedType));
  };

  const handleSave = () => {
    const numericFields = ['icms', 'pis', 'cofins', 'purchase_price', 'sale_price', 'issqn'];
    const cleanedData = { ...formData };
    
    numericFields.forEach(field => {
      if (cleanedData[field] === '' || cleanedData[field] === null || isNaN(parseFloat(cleanedData[field]))) {
        cleanedData[field] = null;
      } else {
        cleanedData[field] = parseFloat(cleanedData[field]);
      }
    });

    const payload = {
      ...cleanedData,
      type: type,
    };
    
    if (type === 'PRODUTO') {
      delete payload.issqn;
    } else if (type === 'SERVICO') {
      delete payload.icms;
      delete payload.purchase_price;
      delete payload.unit;
    } else if (type === 'SERVICO_SCM') {
      delete payload.issqn;
      delete payload.purchase_price;
      delete payload.unit;
    }

    onSave(payload);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-effect border-slate-700 text-slate-200 max-w-3xl">
        {!type ? (
          <ProductTypeSelection onSelect={handleTypeSelect} />
        ) : (
          <>
            <ProductForm type={type} formData={formData} setFormData={setFormData} companies={companies} />
            <DialogFooter className="pt-4 border-t border-slate-700">
              <Button variant="ghost" onClick={handleCancel}>Cancelar</Button>
              <Button className="btn-primary" onClick={handleSave}>Salvar</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}