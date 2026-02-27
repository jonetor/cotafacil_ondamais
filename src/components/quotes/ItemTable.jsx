import React from 'react';
import { Copy, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

function n(v) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

export default function ItemTable({ title, items, onUpdate, onRemove, onDuplicate, type, totals }) {
  const safeItems = Array.isArray(items) ? items : [];

  const get = (item, a, b, fallback = '') => {
    const v = item?.[a];
    if (v !== undefined && v !== null && String(v).trim() !== '') return v;
    const v2 = item?.[b];
    if (v2 !== undefined && v2 !== null && String(v2).trim() !== '') return v2;
    return fallback;
  };

  const getTaxes = (item) => {
    // aceita { taxes:{icms,issqn,...} } ou campos soltos
    const t = item?.taxes || {};
    return {
      icms: n(t.icms ?? item?.icms_percent ?? item?.icms ?? 0),
      issqn: n(t.issqn ?? item?.issqn_percent ?? item?.issqn ?? 0),
    };
  };

  const setTax = (uid, item, key, value) => {
    const current = item?.taxes || {};
    onUpdate(uid, 'taxes', { ...current, [key]: n(value) });
  };

  const typeUpper = String(type || '').toUpperCase();
  const isService =
    typeUpper === 'SERVICE' ||
    typeUpper === 'SCM' ||
    typeUpper === 'SERVICO' ||
    typeUpper === 'SERVICO_SCM' ||
    String(title || '').toLowerCase().includes('serv');

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-semibold text-slate-100">{title}</h3>
      </div>

      {/* sem overflow-x em cada bloco (evita a barra de rolagem horizontal por seção) */}
      <div className="rounded-xl border border-slate-800 overflow-hidden">
        <table className="w-full text-sm text-slate-200 table-fixed">
          <thead className="bg-slate-800/60 text-slate-400">
            <tr>
              <th className="p-3 text-left font-semibold w-32">Código</th>
              <th className="p-3 text-left font-semibold">{isService ? 'Serviço' : 'Produto'}</th>
              <th className="p-3 text-center font-semibold w-24">Qtde</th>
              <th className="p-3 text-right font-semibold w-36">Preço Unit.</th>
              <th className="p-3 text-center font-semibold w-24">{isService ? 'ISSQN %' : 'ICMS %'}</th>
              {isService ? <th className="p-3 text-center font-semibold w-24">Prazo</th> : null}
              <th className="p-3 text-right font-semibold w-40">Valor Total R$</th>
              <th className="p-3 w-24"></th>
            </tr>
          </thead>

          <tbody>
            {safeItems.map((item) => {
              const uid = item.uid ?? item.id;
              const taxes = getTaxes(item);
              const total = n(item.total_price ?? item.valor_total);

              return (
                <tr key={uid} className="border-t border-slate-800 hover:bg-slate-800/40 transition-colors">
                  <td className="p-3">
                    <Input
                      value={get(item, 'code', 'codigo', '')}
                      onChange={(e) => onUpdate(uid, 'code', e.target.value)}
                      className="input-field h-10"
                    />
                  </td>

                  <td className="p-3">
                    <Input
                      value={get(item, 'description', 'descricao', '')}
                      onChange={(e) => onUpdate(uid, 'description', e.target.value)}
                      className="input-field h-10"
                    />
                  </td>

                  <td className="p-3">
                    <Input
                      type="number"
                      min={0}
                      value={n(item.quantity ?? item.qtde)}
                      onChange={(e) => onUpdate(uid, 'quantity', n(e.target.value))}
                      className="input-field h-10 text-center"
                    />
                  </td>

                  <td className="p-3">
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={n(item.unit_price ?? item.preco_base)}
                      onChange={(e) => onUpdate(uid, 'unit_price', n(e.target.value))}
                      className="input-field h-10 text-right"
                    />
                  </td>

                  <td className="p-3">
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={isService ? taxes.issqn : taxes.icms}
                      onChange={(e) => setTax(uid, item, isService ? 'issqn' : 'icms', e.target.value)}
                      className="input-field h-10 text-center"
                    />
                  </td>

                  {isService ? (
                    <td className="p-3">
                      <Input
                        type="number"
                        min={0}
                        value={n(item.prazo)}
                        onChange={(e) => onUpdate(uid, 'prazo', n(e.target.value))}
                        className="input-field h-10 text-center"
                      />
                    </td>
                  ) : null}

                  <td className="p-3 text-right">
                    <div className="h-10 flex items-center justify-end font-mono text-slate-100">
                      {total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </td>

                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {typeof onDuplicate === 'function' ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-slate-400 hover:text-blue-400"
                          onClick={() => onDuplicate(uid)}
                          title="Duplicar"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      ) : null}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-slate-400 hover:text-red-400"
                        onClick={() => onRemove(uid)}
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {safeItems.length === 0 ? (
              <tr>
                <td colSpan={isService ? 8 : 7} className="p-8 text-center text-slate-500">
                  Nenhum item.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {totals ? (
        <div className="flex justify-end">
          <div className="text-right">
            <div className="text-sm text-slate-400">
              Tributos {totals.taxLabel}: R$ {n(totals.tax).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xl font-bold text-slate-100">
              Subtotal {title}: R$ {n(totals.subtotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
