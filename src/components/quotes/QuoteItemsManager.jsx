import React, { useEffect, useState } from "react";
import { Plus, PackageSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { uid as makeUid } from "@/lib/utils";
import ProductSelector from "./ProductSelector";
import ItemTable from "./ItemTable";

const numberParser = (value) => {
  const n = parseFloat(String(value ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

const keyOf = (item) => String(item?.uid ?? item?.id ?? "");

const stopEvt = (e) => {
  if (!e) return;
  if (typeof e.preventDefault === "function") e.preventDefault();
  if (typeof e.stopPropagation === "function") e.stopPropagation();
};

const safeParseJson = (raw) => {
  if (!raw) return null;
  if (typeof raw === "object") return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

// ✅ preço efetivo: funciona para PRODUTO, SERVICO e SCM
const getEffectivePrice = (p) => {
  const direct =
    p?.sale_price ??
    p?.salePrice ??
    p?.loyalty_price ??
    p?.original_price ??
    p?.price ??
    p?.valor ??
    p?.unit_price ??
    p?.preco ??
    p?.preco_venda;

  if (direct !== undefined && direct !== null && String(direct).trim() !== "") {
    return numberParser(direct);
  }

  const raw = safeParseJson(p?.raw_json || p?.rawJson);
  if (raw) {
    const fromRaw =
      raw?.sale_price ??
      raw?.salePrice ??
      raw?.loyalty_price ??
      raw?.original_price ??
      raw?.price ??
      raw?.preco ??
      raw?.preco_venda;

    if (fromRaw !== undefined && fromRaw !== null && String(fromRaw).trim() !== "") {
      return numberParser(fromRaw);
    }
  }

  return 0;
};

function QuoteItemsManager({
  items,
  onItemsChange,
  productItems,
  serviceItems,
  scmServiceItems,
}) {
  const [isProductSelectorOpen, setIsProductSelectorOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const list = Array.isArray(items) ? items : [];
    if (list.length === 0) return;

    let changed = false;
    const normalized = list.map((it) => {
      if (!it?.uid) {
        changed = true;
        return { ...it, uid: makeUid() };
      }
      return it;
    });

    if (changed) onItemsChange(normalized);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const calculateItemTotals = (item) => {
    const quantity = numberParser(item.quantity || 1);
    const unit_price = numberParser(item.unit_price || 0);
    const updatedItem = { ...item, quantity, unit_price };
    updatedItem.total_price = quantity * unit_price;
    return updatedItem;
  };

  const updateItem = (itemKey, field, value, e) => {
    stopEvt(e);
    const newItems = (items ?? []).map((item) => {
      if (keyOf(item) === String(itemKey)) {
        const next = { ...item, [field]: value };
        return calculateItemTotals(next);
      }
      return item;
    });
    onItemsChange(newItems);
  };

  const addItem = (type, e) => {
    stopEvt(e);
    const baseItem = {
      uid: makeUid(),
      source: "manual",
      item_type: type,
      code: "",
      description: "",
      unit: "un",
      quantity: 1,
      unit_price: 0,
      taxes: {},
    };
    onItemsChange([...(items || []), calculateItemTotals(baseItem)]);
  };

  // ✅ AQUI: usa getEffectivePrice para qualquer tipo
  const handleProductMultiSelect = (products) => {
    const list = Array.isArray(products) ? products : [];

    const newItemsFromCatalog = list.map((product) => {
      const newItem = {
        uid: makeUid(),
        id: product.id,
        source: "catalog",
        item_type: product.type,
        code: product.cod,
        description: product.description,
        unit: product.unit || "un",
        quantity: 1,
        unit_price: getEffectivePrice(product),
        taxes: {
          icms: product.icms,
          pis: product.pis,
          cofins: product.cofins,
          issqn: product.issqn,
        },
      };
      return calculateItemTotals(newItem);
    });

    onItemsChange([...(items || []), ...newItemsFromCatalog]);
    setIsProductSelectorOpen(false);
    toast({ title: `${list.length} item(s) adicionado(s)!` });
  };

  const duplicateItem = (itemKey, e) => {
    stopEvt(e);
    const list = items ?? [];
    const idx = list.findIndex((it) => keyOf(it) === String(itemKey));
    if (idx < 0) return;

    const itemToDuplicate = list[idx];
    const clone = calculateItemTotals({
      ...itemToDuplicate,
      uid: makeUid(),
      id: null,
    });

    const next = [...list.slice(0, idx + 1), clone, ...list.slice(idx + 1)];
    onItemsChange(next);
  };

  const removeItem = (itemKey, e) => {
    stopEvt(e);
    const k = String(itemKey);
    onItemsChange((items ?? []).filter((it) => keyOf(it) !== k));
  };

  return (
    <div className="form-section">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Itens da Cotação</h3>

        <div className="flex items-center gap-2">
          <Dialog open={isProductSelectorOpen} onOpenChange={setIsProductSelectorOpen}>
            <DialogTrigger asChild>
              <Button type="button" variant="outline" className="btn-secondary">
                <PackageSearch className="w-4 h-4 mr-2" />
                Adicionar do Catálogo
              </Button>
            </DialogTrigger>

            <DialogContent className="glass-effect border-white/20 text-white w-[min(900px,92vw)] max-w-3xl overflow-hidden">
              <DialogHeader>
                <DialogTitle className="text-white">Selecionar Itens</DialogTitle>
              </DialogHeader>
              <ProductSelector onMultiSelect={handleProductMultiSelect} />
            </DialogContent>
          </Dialog>

          <Button type="button" onClick={(e) => addItem("PRODUTO", e)} className="btn-primary">
            <Plus className="w-4 h-4 mr-2" />
            Produto
          </Button>
          <Button type="button" onClick={(e) => addItem("SERVICO", e)} className="btn-secondary">
            <Plus className="w-4 h-4 mr-2" />
            Serviço
          </Button>
          <Button type="button" onClick={(e) => addItem("SERVICO_SCM", e)} className="btn-secondary">
            <Plus className="w-4 h-4 mr-2" />
            Serviço SCM
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {productItems?.length > 0 ? (
          <ItemTable title="Produtos" items={productItems} onUpdate={updateItem} onDuplicate={duplicateItem} onRemove={removeItem} type="product" />
        ) : null}
        {serviceItems?.length > 0 ? (
          <ItemTable title="Serviços" items={serviceItems} onUpdate={updateItem} onDuplicate={duplicateItem} onRemove={removeItem} type="service" />
        ) : null}
        {scmServiceItems?.length > 0 ? (
          <ItemTable title="Serviços SCM" items={scmServiceItems} onUpdate={updateItem} onDuplicate={duplicateItem} onRemove={removeItem} type="scm" />
        ) : null}
      </div>
    </div>
  );
}

export default QuoteItemsManager;