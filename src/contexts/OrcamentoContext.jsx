import React, { createContext, useContext, useMemo, useState } from "react";

const OrcamentoContext = createContext(null);

export function OrcamentoProvider({ children }) {
  const [clienteSelecionado, setClienteSelecionado] = useState(null);
  const [itens, setItens] = useState([]); // { id, nome, preco, qtd, subtotal }

  const addItem = (produto) => {
    setItens((prev) => {
      const id = String(produto.id ?? produto.product_id ?? produto.sku ?? Date.now());
      const existente = prev.find((i) => i.id === id);
      const preco = Number(produto.preco ?? produto.price ?? 0) || 0;

      if (existente) {
        return prev.map((i) =>
          i.id === id ? { ...i, qtd: i.qtd + 1, subtotal: (i.qtd + 1) * i.preco } : i
        );
      }

      return [
        ...prev,
        {
          id,
          nome: produto.nome ?? produto.name ?? produto.descricao ?? "Produto",
          preco,
          qtd: 1,
          subtotal: preco
        }
      ];
    });
  };

  const updateItem = (id, patch) => {
    setItens((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i;
        const qtd = patch.qtd != null ? Number(patch.qtd) : i.qtd;
        const preco = patch.preco != null ? Number(patch.preco) : i.preco;
        const safeQtd = Number.isFinite(qtd) && qtd > 0 ? qtd : 1;
        const safePreco = Number.isFinite(preco) && preco >= 0 ? preco : 0;
        return { ...i, ...patch, qtd: safeQtd, preco: safePreco, subtotal: safeQtd * safePreco };
      })
    );
  };

  const removeItem = (id) => setItens((prev) => prev.filter((i) => i.id !== id));

  const total = useMemo(() => itens.reduce((acc, i) => acc + (Number(i.subtotal) || 0), 0), [itens]);

  const value = {
    clienteSelecionado,
    setClienteSelecionado,
    itens,
    addItem,
    updateItem,
    removeItem,
    total
  };

  return <OrcamentoContext.Provider value={value}>{children}</OrcamentoContext.Provider>;
}

export function useOrcamento() {
  const ctx = useContext(OrcamentoContext);
  if (!ctx) throw new Error("useOrcamento must be used within OrcamentoProvider");
  return ctx;
}