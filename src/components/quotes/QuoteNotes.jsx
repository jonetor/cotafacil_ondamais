import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

function QuoteNotes({ formData, handleInputChange }) {
  return (
    <div className="form-section space-y-4">
      <h3 className="text-lg font-semibold text-white">Informações Adicionais</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="validity_days">Validade da Proposta (dias)</Label>
          <Input type="number" name="validity_days" value={formData.validity_days} onChange={handleInputChange} className="input-field" />
        </div>
        <div>
          <Label htmlFor="payment_terms">Condições de Pagamento</Label>
          <Input name="payment_terms" value={formData.payment_terms} onChange={handleInputChange} className="input-field" placeholder="Ex: 30/60/90" />
        </div>
        <div>
          <Label htmlFor="freight_type">Tipo de Frete</Label>
          <Input name="freight_type" value={formData.freight_type} onChange={handleInputChange} className="input-field" placeholder="Ex: CIF, FOB" />
        </div>
        <div>
          <Label htmlFor="delivery_location">Local de Entrega</Label>
          <Input name="delivery_location" value={formData.delivery_location} onChange={handleInputChange} className="input-field" placeholder="Ex: Endereço do cliente" />
        </div>
      </div>
      
      <div>
        <Label htmlFor="notes">Observações e Condições Gerais</Label>
        <Textarea
          name="notes"
          value={formData.notes}
          onChange={handleInputChange}
          className="input-field w-full h-24 resize-none"
          placeholder="Insira aqui as condições, garantias, etc."
        />
      </div>
    </div>
  );
}

export default QuoteNotes;