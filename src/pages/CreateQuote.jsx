import React, { useMemo, useState } from 'react';
import { uid, formatCurrencyBR } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import QuoteItemsManager from '@/components/quotes/QuoteItemsManager';
import { useData } from '@/contexts/DataContext';

export default function QuoteCreate() {
  const { addQuote } = useData();
  const [items, setItems] = useState([]);

  const totais = useMemo(() => {
    const total = items.reduce((s, it) => s + (it.valor_total_item ?? 0), 0);
    return { total };
  }, [items]);

  const salvar = () => {
    const quote = {
      id: uid(),
      createdAt: new Date().toISOString(),
      items,
      total: totais.total,
    };
    addQuote(quote);
  };

  return (
    <div className="p-6">
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-white text-xl">Nova Cotação</h2>
        <div className="text-white/90 font-semibold">Total: {formatCurrencyBR(totais.total)}</div>
      </div>

      <QuoteItemsManager
        items={items}
        onItemsChange={(newItems) => setItems([...newItems])}
      />

      <div className="mt-6 flex justify-end">
        <Button className="btn-primary" onClick={salvar}>Salvar Cotação</Button>
      </div>
    </div>
  );
}