import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useOrcamento } from "@/contexts/OrcamentoContext";

function toNumber(v) {
  // aceita "10,50" ou "10.50"
  const s = String(v ?? "").replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function moneyBR(v) {
  const n = Number(v || 0);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function OrcamentoItens() {
  const navigate = useNavigate();
  const { clienteSelecionado } = useOrcamento();

  // itens manuais: { id, descricao, qtd, preco }
  const [itens, setItens] = useState([]);
  const [novo, setNovo] = useState({ descricao: "", qtd: 1, preco: "" });

  const total = useMemo(() => {
    return itens.reduce((acc, i) => acc + (Number(i.qtd) || 0) * (Number(i.preco) || 0), 0);
  }, [itens]);

  if (!clienteSelecionado) {
    return (
      <div className="p-8 text-slate-200">
        <h1 className="text-2xl font-bold mb-3">Itens do Orçamento</h1>
        <p className="text-slate-400 mb-6">
          Nenhum cliente selecionado. Volte em Clientes e selecione um cliente para continuar.
        </p>
        <Button className="btn-primary" onClick={() => navigate("/clientes")}>
          Voltar para Clientes
        </Button>
      </div>
    );
  }

  const addItem = () => {
    const descricao = String(novo.descricao || "").trim();
    const qtd = Math.max(1, parseInt(novo.qtd, 10) || 1);
    const preco = toNumber(novo.preco);

    if (!descricao) return;

    setItens((prev) => [
      ...prev,
      {
        id: String(Date.now()) + "_" + Math.random().toString(16).slice(2),
        descricao,
        qtd,
        preco
      }
    ]);

    setNovo({ descricao: "", qtd: 1, preco: "" });
  };

  const updateItem = (id, patch) => {
    setItens((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i;
        const qtd = patch.qtd != null ? Math.max(1, parseInt(patch.qtd, 10) || 1) : i.qtd;
        const preco = patch.preco != null ? toNumber(patch.preco) : i.preco;
        const descricao = patch.descricao != null ? patch.descricao : i.descricao;
        return { ...i, qtd, preco, descricao };
      })
    );
  };

  const removeItem = (id) => setItens((prev) => prev.filter((i) => i.id !== id));

  return (
    <div className="p-8 text-slate-200 space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Itens do Orçamento</h1>
          <p className="text-slate-400">
            Cliente: <span className="text-slate-200">{clienteSelecionado.nome_razao}</span>
          </p>
          <p className="text-slate-500 text-sm">
            {clienteSelecionado.cpf_cnpj} • {clienteSelecionado.city}
            {clienteSelecionado.state ? ` - ${clienteSelecionado.state}` : ""}
          </p>
        </div>

        <div className="text-right">
          <div className="text-slate-400 text-sm">Total</div>
          <div className="text-2xl font-bold text-slate-100">{moneyBR(total)}</div>
        </div>
      </div>

      {/* Adicionar item */}
      <div className="floating-card p-6 space-y-4">
        <div className="text-slate-100 font-semibold">Adicionar item manual</div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-7">
            <Input
              className="input-field"
              placeholder="Descrição do produto/serviço (ex: Link dedicado 300Mb)"
              value={novo.descricao}
              onChange={(e) => setNovo((p) => ({ ...p, descricao: e.target.value }))}
            />
          </div>

          <div className="md:col-span-2">
            <Input
              className="input-field"
              type="number"
              min="1"
              placeholder="Qtd"
              value={novo.qtd}
              onChange={(e) => setNovo((p) => ({ ...p, qtd: e.target.value }))}
            />
          </div>

          <div className="md:col-span-3">
            <Input
              className="input-field"
              inputMode="decimal"
              placeholder="Preço unit. (ex: 199,90)"
              value={novo.preco}
              onChange={(e) => setNovo((p) => ({ ...p, preco: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addItem();
                }
              }}
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button className="btn-primary" onClick={addItem} disabled={!String(novo.descricao || "").trim()}>
            Adicionar
          </Button>

          <Button variant="secondary" onClick={() => setNovo({ descricao: "", qtd: 1, preco: "" })}>
            Limpar
          </Button>
        </div>
      </div>

      {/* Lista de itens */}
      <div className="floating-card p-6 space-y-4">
        <div className="text-slate-100 font-semibold">Itens do orçamento</div>

        {itens.length === 0 ? (
          <div className="text-slate-400">Nenhum item adicionado ainda.</div>
        ) : (
          <div className="space-y-3">
            {itens.map((i) => {
              const subtotal = (Number(i.qtd) || 0) * (Number(i.preco) || 0);

              return (
                <div
                  key={i.id}
                  className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-900/40 border border-slate-700 rounded-lg p-4"
                >
                  <div className="flex-1">
                    <Input
                      className="input-field"
                      value={i.descricao}
                      onChange={(e) => updateItem(i.id, { descricao: e.target.value })}
                    />
                    <div className="text-slate-400 text-sm mt-2">
                      Subtotal: <span className="text-slate-200 font-semibold">{moneyBR(subtotal)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex flex-col">
                      <span className="text-slate-400 text-xs">Qtd</span>
                      <input
                        className="w-24 rounded-md bg-slate-800 border border-slate-700 px-2 py-2 text-slate-100"
                        type="number"
                        min="1"
                        value={i.qtd}
                        onChange={(e) => updateItem(i.id, { qtd: e.target.value })}
                      />
                    </div>

                    <div className="flex flex-col">
                      <span className="text-slate-400 text-xs">Preço</span>
                      <input
                        className="w-32 rounded-md bg-slate-800 border border-slate-700 px-2 py-2 text-slate-100"
                        inputMode="decimal"
                        value={String(i.preco).replace(".", ",")}
                        onChange={(e) => updateItem(i.id, { preco: e.target.value })}
                      />
                    </div>

                    <Button variant="secondary" onClick={() => removeItem(i.id)}>
                      Remover
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Ações */}
      <div className="flex gap-2">
        <Button variant="secondary" onClick={() => navigate("/orcamentos/novo")}>
          Voltar
        </Button>

        <Button
          className="btn-primary"
          disabled={itens.length === 0}
          onClick={() => alert("Próximo passo: salvar orçamento / gerar PDF / enviar por WhatsApp")}
        >
          Finalizar
        </Button>
      </div>
    </div>
  );
}