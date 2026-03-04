import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

import { listProducts } from "@/services/products";

function formatBRL(value) {
  const n = Number(value || 0);
  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function getPrice(product) {
  return (
    product?.sale_price ??
    product?.original_price ??
    product?.loyalty_price ??
    product?.price ??
    0
  );
}

export default function ProductSelector({ onMultiSelect }) {
  const { toast } = useToast();

  const [products, setProducts] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("ALL");
  const [loading, setLoading] = useState(false);

  async function loadProducts() {
    setLoading(true);
    try {
      const data = await listProducts();
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar produtos",
        description: String(err),
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();

    return products.filter((p) => {
      const type = String(p.type || "").toUpperCase();

      if (tab === "PRODUTO" && type !== "PRODUTO") return false;
      if (tab === "SERVICO" && type !== "SERVICO") return false;
      if (tab === "SCM" && type !== "SERVICO_SCM") return false;

      if (!s) return true;

      return (
        String(p.cod || "").toLowerCase().includes(s) ||
        String(p.description || "").toLowerCase().includes(s)
      );
    });
  }, [products, search, tab]);

  function toggle(id) {
    const next = new Set(selected);

    if (next.has(id)) next.delete(id);
    else next.add(id);

    setSelected(next);
  }

  function toggleAll() {
    const ids = filtered.map((p) => String(p.id));

    const next = new Set(selected);

    const allSelected = ids.every((id) => next.has(id));

    if (allSelected) ids.forEach((id) => next.delete(id));
    else ids.forEach((id) => next.add(id));

    setSelected(next);
  }

  function addSelected() {
    const list = products.filter((p) => selected.has(String(p.id)));

    if (list.length === 0) {
      toast({
        variant: "destructive",
        title: "Nada selecionado",
      });
      return;
    }

    onMultiSelect?.(list);
    setSelected(new Set());
  }

  return (
    <div className="flex flex-col h-[70vh]">

      {/* BUSCA */}
      <div className="flex gap-2 mb-3">
        <Input
          placeholder="Buscar produto..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <Button variant="secondary" onClick={loadProducts} disabled={loading}>
          Recarregar
        </Button>
      </div>

      {/* TABS */}
      <div className="flex gap-2 mb-3">

        <Button
          variant={tab === "ALL" ? "default" : "secondary"}
          onClick={() => setTab("ALL")}
        >
          Todos
        </Button>

        <Button
          variant={tab === "PRODUTO" ? "default" : "secondary"}
          onClick={() => setTab("PRODUTO")}
        >
          Produtos
        </Button>

        <Button
          variant={tab === "SERVICO" ? "default" : "secondary"}
          onClick={() => setTab("SERVICO")}
        >
          Serviços
        </Button>

        <Button
          variant={tab === "SCM" ? "default" : "secondary"}
          onClick={() => setTab("SCM")}
        >
          SCM
        </Button>

        <div className="flex-1" />

        <Button variant="secondary" onClick={toggleAll}>
          Marcar todos
        </Button>

      </div>

      {/* LISTA */}
      <div className="flex-1 overflow-y-auto border rounded-xl">

        {filtered.map((product) => {
          const id = String(product.id);
          const checked = selected.has(id);

          const price = getPrice(product);

          return (
            <label
              key={id}
              className={cn(
                "flex justify-between items-center px-4 py-3 border-b cursor-pointer hover:bg-white/5",
                checked && "bg-white/5"
              )}
            >

              <div className="flex items-center gap-3">

                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(id)}
                />

                <div>
                  <div className="text-white font-medium">
                    {product.cod} — {product.description}
                  </div>

                  <div className="text-xs text-white/60">
                    Tipo: {product.type} • Un: {product.unit || "-"}
                  </div>
                </div>

              </div>

              {/* PREÇO */}
              <div className="text-right font-semibold text-white">
                {formatBRL(price)}
              </div>

            </label>
          );
        })}

        {filtered.length === 0 && (
          <div className="p-6 text-center text-white/60">
            Nenhum item encontrado
          </div>
        )}

      </div>

      {/* BOTÃO */}
      <div className="mt-3 flex justify-between items-center">

        <div className="text-sm text-white/60">
          {selected.size} selecionado(s)
        </div>

        <Button
          onClick={addSelected}
          disabled={selected.size === 0}
        >
          + Adicionar Selecionados
        </Button>

      </div>

    </div>
  );
}