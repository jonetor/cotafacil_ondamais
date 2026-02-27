import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DialogFooter } from '@/components/ui/dialog';
import { useData } from '@/contexts/SupabaseDataContext';
import { Checkbox } from '@/components/ui/checkbox';
import { Package, Wrench, Wifi } from 'lucide-react';
import { formatCurrencyBR } from '@/lib/utils';

function ProductSelector({ onMultiSelect }) {
    const { products } = useData();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProducts, setSelectedProducts] = useState({});

    const filteredProducts = (products ?? []).filter((p) => {
        const desc = (p.description ?? '').toLowerCase();
        const cod = (p.cod ?? '').toLowerCase();
        const q = searchTerm.toLowerCase();
        return desc.includes(q) || cod.includes(q);
    });

    const handleToggleProduct = (product) => {
        setSelectedProducts((prev) => {
            const next = { ...prev };
            if (next[product.id]) delete next[product.id];
            else next[product.id] = product;
            return next;
        });
    };

    const handleAddSelected = () => {
        onMultiSelect(Object.values(selectedProducts));
        setSelectedProducts({});
    };

    const selectedCount = Object.keys(selectedProducts).length;

    const getIcon = (type) => {
        switch(type) {
            case 'PRODUTO': return <Package className="w-5 h-5 text-teal-400" />;
            case 'SERVICO': return <Wrench className="w-5 h-5 text-indigo-400" />;
            case 'SERVICO_SCM': return <Wifi className="w-5 h-5 text-amber-400" />;
            default: return <Package className="w-5 h-5 text-gray-400" />;
        }
    }

    return (
        <div className="flex flex-col h-[60vh]">
            <Input
                placeholder="Buscar por código ou descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field mb-4"
            />

            <div className="flex-grow max-h-full overflow-y-auto space-y-2 pr-2">
                {filteredProducts.map((product) => (
                    <div
                        key={product.id}
                        className={`p-3 bg-slate-800/50 rounded-lg cursor-pointer hover:bg-slate-700/50 flex items-center transition-all ${selectedProducts[product.id] ? 'ring-2 ring-cyan-400' : ''}`}
                        onClick={() => handleToggleProduct(product)}
                    >
                        <Checkbox
                            checked={!!selectedProducts[product.id]}
                            onCheckedChange={() => handleToggleProduct(product)}
                            onClick={(e) => e.stopPropagation()}
                            className="mr-4"
                        />
                        <div className="flex items-center gap-3 flex-grow">
                            {getIcon(product.type)}
                            <div>
                                <p className="font-semibold text-white">{product.description}</p>
                                <p className="text-sm text-white/60">
                                    Código: {product.cod} | Preço: {formatCurrencyBR(product.sale_price)}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <DialogFooter className="pt-4 mt-auto border-t border-slate-700">
                <div className="text-white/70">{selectedCount} item(s) selecionado(s)</div>
                <Button onClick={handleAddSelected} className="btn-primary" disabled={selectedCount === 0}>
                    <Plus className="w-4 h-4 mr-2" /> Adicionar Selecionados
                </Button>
            </DialogFooter>
        </div>
    );
}

export default ProductSelector;