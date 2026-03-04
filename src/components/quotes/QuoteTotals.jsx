import React from 'react';

const QuoteTotals = ({ totais }) => {
    const formatCurrency = (value) => (value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    return (
        <div className="space-y-3 text-white">
            <h3 className="text-lg font-semibold">Resumo da Cotação</h3>
            <div className="space-y-2 p-4 bg-slate-900/50 rounded-lg">
                {totais.subtotalProdutos > 0 && (
                    <div className="flex justify-between items-center text-slate-300">
                        <span>Subtotal Produtos:</span>
                        <span>{formatCurrency(totais.subtotalProdutos)}</span>
                    </div>
                )}
                {totais.subtotalServicos > 0 && (
                    <div className="flex justify-between items-center text-slate-300">
                        <span>Subtotal Serviços:</span>
                        <span>{formatCurrency(totais.subtotalServicos)}</span>
                    </div>
                )}
                {totais.subtotalScm > 0 && (
                    <div className="flex justify-between items-center text-slate-300">
                        <span>Subtotal Serviços SCM:</span>
                        <span>{formatCurrency(totais.subtotalScm)}</span>
                    </div>
                )}
                <div className="pt-2 mt-2 border-t border-slate-700 space-y-1">
                    <div className="flex justify-between items-center text-amber-400 text-sm">
                        <span>Tributos Federais (est.):</span>
                        <span>{formatCurrency(totais.totalTributosFederais)}</span>
                    </div>
                    <div className="flex justify-between items-center text-amber-400 text-sm">
                        <span>Tributos Estaduais/Mun. (est.):</span>
                        <span>{formatCurrency(totais.totalTributosEstaduais + totais.totalTributosMunicipais)}</span>
                    </div>
                </div>
                <div className="flex justify-between items-center text-xl font-bold text-white pt-2 border-t border-slate-700">
                    <span>Total Geral:</span>
                    <span className="text-cyan-400">{formatCurrency(totais.totalGeral)}</span>
                </div>
            </div>
        </div>
    );
};

export default QuoteTotals;