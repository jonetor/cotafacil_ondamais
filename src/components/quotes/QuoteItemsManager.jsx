import React, { useState } from 'react';
import { Plus, PackageSearch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { uid } from '@/lib/utils';
import ProductSelector from './ProductSelector';
import ItemTable from './ItemTable';

const numberParser = (value) => {
    const n = parseFloat(String(value ?? '').replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
};

function QuoteItemsManager({ items, onItemsChange, productItems, serviceItems, scmServiceItems }) {
    const [isProductSelectorOpen, setIsProductSelectorOpen] = useState(false);
    const { toast } = useToast();

    const calculateItemTotals = (item) => {
        const quantity = numberParser(item.quantity || 1);
        const unit_price = numberParser(item.unit_price || 0);

        const updatedItem = { ...item, quantity, unit_price };
        updatedItem.total_price = quantity * unit_price;
        
        return updatedItem;
    };

    const updateItem = (itemUid, field, value) => {
        const newItems = (items ?? []).map((item) => {
            if (item.uid === itemUid) {
                const next = { ...item, [field]: value };
                return calculateItemTotals(next);
            }
            return item;
        });
        onItemsChange(newItems);
    };

    const addItem = (type) => {
        const baseItem = {
            uid: uid(), source: 'manual',
            item_type: type,
            code: '', description: '',
            unit: 'un',
            quantity: 1,
            unit_price: 0,
            taxes: {},
        };

        const newItem = calculateItemTotals(baseItem);
        onItemsChange([...(items || []), newItem]);
    };

    const handleProductMultiSelect = (products) => {
        const newItemsFromCatalog = (products ?? []).map((product) => {
            const newItem = {
                uid: uid(),
                id: product.id, 
                source: 'catalog',
                item_type: product.type,
                code: product.cod,
                description: product.description,
                unit: product.unit,
                quantity: 1,
                unit_price: numberParser(product.sale_price),
                taxes: {
                    icms: product.icms,
                    pis: product.pis,
                    cofins: product.cofins,
                    issqn: product.issqn,
                }
            };
            return calculateItemTotals(newItem);
        });

        onItemsChange([...(items || []), ...newItemsFromCatalog]);
        setIsProductSelectorOpen(false);
        toast({ title: `${products.length} item(s) adicionado(s)!` });
    };

    const duplicateItem = (itemUid) => {
        const itemToDuplicate = (items ?? []).find((it) => it.uid === itemUid);
        if (!itemToDuplicate) return;
        const idx = (items ?? []).findIndex((it) => it.uid === itemUid);
        const clone = calculateItemTotals({ ...itemToDuplicate, uid: uid(), id: null });
        const next = [...items.slice(0, idx + 1), clone, ...items.slice(idx + 1)];
        onItemsChange(next);
    };

    const removeItem = (itemUid) => {
        onItemsChange((items ?? []).filter((it) => it.uid !== itemUid));
    };

    return (
        <div className="form-section">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Itens da Cotação</h3>
                <div className="flex items-center gap-2">
                    <Dialog open={isProductSelectorOpen} onOpenChange={setIsProductSelectorOpen}>
                        <DialogTrigger asChild>
                            <Button type="button" variant="outline" className="btn-secondary">
                                <PackageSearch className="w-4 h-4 mr-2" />Adicionar do Catálogo
                            </Button>
                        </DialogTrigger>
          <DialogContent className="glass-effect border-white/20 text-white w-[min(900px,92vw)] max-w-3xl overflow-hidden">
                            <DialogHeader><DialogTitle className="text-white">Selecionar Itens</DialogTitle></DialogHeader>
                            <ProductSelector onMultiSelect={handleProductMultiSelect} />
                        </DialogContent>
                    </Dialog>
                    <Button type="button" onClick={() => addItem('PRODUTO')} className="btn-primary"><Plus className="w-4 h-4 mr-2" />Produto</Button>
                    <Button type="button" onClick={() => addItem('SERVICO')} className="btn-secondary"><Plus className="w-4 h-4 mr-2" />Serviço</Button>
                    <Button type="button" onClick={() => addItem('SERVICO_SCM')} className="btn-secondary"><Plus className="w-4 h-4 mr-2" />Serviço SCM</Button>
                </div>
            </div>

            <div className="space-y-6">
                {productItems.length > 0 ? (
                  <ItemTable title="Produtos" items={productItems} onUpdate={updateItem} onDuplicate={duplicateItem} onRemove={removeItem} type="product" />
                ) : null}
                {serviceItems.length > 0 ? (
                  <ItemTable title="Serviços" items={serviceItems} onUpdate={updateItem} onDuplicate={duplicateItem} onRemove={removeItem} type="service" />
                ) : null}
                {scmServiceItems.length > 0 ? (
                  <ItemTable title="Serviços SCM" items={scmServiceItems} onUpdate={updateItem} onDuplicate={duplicateItem} onRemove={removeItem} type="scm" />
                ) : null}
            </div>
        </div>
    );
}

export default QuoteItemsManager;