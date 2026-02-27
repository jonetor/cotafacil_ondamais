import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, Package, Wrench, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';

const LS_TOKEN_KEY = 'token';

function getBffUrl() {
  return (import.meta.env.VITE_BFF_URL || 'http://localhost:3000').replace(/\/$/, '');
}

async function bffGet(path) {
  const base = getBffUrl();
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;
  const token = localStorage.getItem(LS_TOKEN_KEY);

  const headers = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, { method: 'GET', headers });
  const text = await res.text();

  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (!res.ok) {
    const msg = (json && (json.message || json.error)) || text || `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return json;
}

function toType(p) {
  // 1) se vier do BFF/DB já pode vir "type" pronto
  const t = String(p?.type || '').toUpperCase();
  if (t === 'PRODUTO' || t === 'SERVICO' || t === 'SERVICO_SCM') return t;

  // 2) se vier via "use" do Voalle
  const use = String(p?.use || '').toUpperCase();
  if (use === 'P') return 'PRODUTO';
  if (use === 'R') return 'SERVICO';
  if (use === 'S') return 'SERVICO';
  return 'SERVICO';
}

function normalizeProduct(p) {
  const cod = String(p?.cod ?? p?.code ?? p?.codigo ?? '').trim();
  const description = String(p?.description ?? p?.name ?? p?.title ?? '').trim();

  const sale_price = Number(
    p?.sale_price ??
      p?.salePrice ??
      p?.price ??
      p?.minimumPromotionalPrice ??
      p?.sellingPrice ??
      0
  );

  const type = toType(p);

  const id =
    p?.id ||
    `${cod}-${p?.priceListCode || p?.price_list_code || '00'}-${p?.campaignCode || p?.campaign_code || '00'}`;

  return {
    ...p,
    id,
    cod,
    description,
    sale_price: Number.isFinite(sale_price) ? sale_price : 0,
    type,
    unit: p?.unit || p?.unidade || 'un',
  };
}

function TypePill({ type }) {
  const t = String(type || '').toUpperCase();
  const common = 'px-2 py-1 rounded-full text-xs font-medium border border-white/10';

  if (t === 'PRODUTO') {
    return (
      <span className={`${common} bg-cyan-500/10 text-cyan-300 inline-flex items-center gap-1`}>
        <Package className="w-3 h-3" /> Produto
      </span>
    );
  }

  if (t === 'SERVICO_SCM') {
    return (
      <span className={`${common} bg-amber-500/10 text-amber-300 inline-flex items-center gap-1`}>
        <Wifi className="w-3 h-3" /> SCM
      </span>
    );
  }

  return (
    <span className={`${common} bg-purple-500/10 text-purple-300 inline-flex items-center gap-1`}>
      <Wrench className="w-3 h-3" /> Serviço
    </span>
  );
}

function ProductSelector({ onMultiSelect }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProducts, setSelectedProducts] = useState({});

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // filtro por tipo (ALL/PRODUTO/SERVICO/SERVICO_SCM)
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Busca no BFF (/api/products)
  useEffect(() => {
    let alive = true;
    const timeout = setTimeout(async () => {
      try {
        setLoading(true);
        setError('');

        const q = String(searchTerm || '').trim();
        const qs = new URLSearchParams();
        qs.set('use', 'ALL');
        qs.set('limit', '20000');
        if (q) qs.set('q', q);

        const data = await bffGet(`/api/products?${qs.toString()}`);
        const arr = Array.isArray(data?.items) ? data.items : [];
        const normalized = arr.map(normalizeProduct).filter((p) => p.cod || p.description);

        if (alive) setItems(normalized);
      } catch (e) {
        if (alive) {
          setItems([]);
          setError(String(e?.message || e));
        }
      } finally {
        if (alive) setLoading(false);
      }
    }, 250);

    return () => {
      alive = false;
      clearTimeout(timeout);
    };
  }, [searchTerm]);

  const availableTypes = useMemo(() => {
    const s = new Set();
    for (const it of items) s.add(String(it.type || '').toUpperCase());
    return {
      PRODUTO: s.has('PRODUTO'),
      SERVICO: s.has('SERVICO'),
      SERVICO_SCM: s.has('SERVICO_SCM'),
    };
  }, [items]);

  // se o filtro atual não existe no dataset, volta para ALL
  useEffect(() => {
    if (typeFilter === 'ALL') return;
    if (!availableTypes[typeFilter]) setTypeFilter('ALL');
  }, [availableTypes, typeFilter]);

  const filteredProducts = useMemo(() => {
    const list = Array.isArray(items) ? items : [];
    if (typeFilter === 'ALL') return list;
    return list.filter((p) => String(p.type || '').toUpperCase() === typeFilter);
  }, [items, typeFilter]);

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

  return (
    <div className="flex flex-col h-[60vh] w-full min-w-0">
      <div className="flex flex-col gap-3 mb-4">
        <Input
          placeholder="Buscar por código ou descrição..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input-field w-full max-w-full"
        />

        {/* filtros por tipo - só aparecem se existir pelo menos 1 item daquele tipo */}
        <div className="flex flex-wrap gap-2 w-full min-w-0">
          <Button
            type="button"
            variant={typeFilter === 'ALL' ? 'default' : 'outline'}
            className={typeFilter === 'ALL' ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setTypeFilter('ALL')}
          >
            Todos
          </Button>

          {availableTypes.PRODUTO ? (
            <Button
              type="button"
              variant={typeFilter === 'PRODUTO' ? 'default' : 'outline'}
              className={typeFilter === 'PRODUTO' ? 'btn-primary' : 'btn-secondary'}
              onClick={() => setTypeFilter('PRODUTO')}
            >
              Produtos
            </Button>
          ) : null}

          {availableTypes.SERVICO ? (
            <Button
              type="button"
              variant={typeFilter === 'SERVICO' ? 'default' : 'outline'}
              className={typeFilter === 'SERVICO' ? 'btn-primary' : 'btn-secondary'}
              onClick={() => setTypeFilter('SERVICO')}
            >
              Serviços
            </Button>
          ) : null}

          {availableTypes.SERVICO_SCM ? (
            <Button
              type="button"
              variant={typeFilter === 'SERVICO_SCM' ? 'default' : 'outline'}
              className={typeFilter === 'SERVICO_SCM' ? 'btn-primary' : 'btn-secondary'}
              onClick={() => setTypeFilter('SERVICO_SCM')}
            >
              SCM
            </Button>
          ) : null}
        </div>
      </div>

      {error ? <div className="text-sm text-red-400 mb-3">{error}</div> : null}

      <div className="flex-grow max-h-full overflow-y-auto space-y-2 pr-2 w-full min-w-0">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-white/70 p-3">
            <Loader2 className="w-4 h-4 animate-spin" /> Carregando catálogo...
          </div>
        ) : null}

        {filteredProducts.map((product) => (
          <div
            key={product.id}
            className={`p-3 bg-slate-800/50 rounded-lg cursor-pointer hover:bg-slate-700/50 flex items-start gap-3 transition-all min-w-0 ${
              selectedProducts[product.id] ? 'ring-2 ring-cyan-400' : ''
            }`}
            onClick={() => handleToggleProduct(product)}
          >
            <Checkbox
              checked={!!selectedProducts[product.id]}
              onCheckedChange={() => handleToggleProduct(product)}
              onClick={(e) => e.stopPropagation()}
              className="mt-1"
            />

            <div className="flex flex-col gap-1 flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 min-w-0">
                <div className="min-w-0">
                  <p className="font-semibold text-white truncate">{product.description || '-'}</p>
                  <p className="text-sm text-white/60 truncate">Código: {product.cod || '-'}</p>
                </div>
                <TypePill type={product.type} />
              </div>

              <div className="text-sm text-white/70">
                Preço: R$ {(Number(product.sale_price) || 0).toFixed(2)}
              </div>
            </div>
          </div>
        ))}

        {!loading && filteredProducts.length === 0 ? (
          <div className="text-sm text-white/60 p-3">Nenhum item encontrado.</div>
        ) : null}
      </div>

      <DialogFooter className="pt-4 mt-auto border-t border-slate-700 flex items-center justify-between gap-3 flex-wrap">
        <div className="text-white/70">{selectedCount} item(s) selecionado(s)</div>
        <Button onClick={handleAddSelected} className="btn-primary" disabled={selectedCount === 0}>
          <Plus className="w-4 h-4 mr-2" /> Adicionar Selecionados
        </Button>
      </DialogFooter>
    </div>
  );
}

export default ProductSelector;
