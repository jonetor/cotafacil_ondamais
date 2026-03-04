import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useOrcamento } from "@/contexts/OrcamentoContext";

export default function OrcamentoItens() {
  const navigate = useNavigate();
  const { clienteSelecionado } = useOrcamento();

  if (!clienteSelecionado) {
    return (
      <div className="p-8 text-slate-200">
        <p className="text-slate-400 mb-4">Nenhum cliente selecionado.</p>
        <Button onClick={() => navigate("/clientes")}>Voltar</Button>
      </div>
    );
  }

  return (
    <div className="p-8 text-slate-200 space-y-4">
      <h1 className="text-2xl font-bold">Itens do Orçamento</h1>
      <div className="text-slate-400">
        Cliente: <span className="text-slate-200">{clienteSelecionado.nome_razao}</span>
      </div>

      <div className="floating-card p-6">
        Aqui vai a lista de itens (produtos/serviços), quantidades e total.
      </div>

      <div className="flex gap-2">
        <Button variant="secondary" onClick={() => navigate("/orcamentos/novo")}>
          Voltar
        </Button>
        <Button className="btn-primary" onClick={() => navigate("/orcamentos/itens")}>
          Continuar
        </Button>
      </div>
    </div>
  );
}