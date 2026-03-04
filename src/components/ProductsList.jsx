import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import ProductCreateDialog from "@/components/products/ProductCreateDialog";
import { useData } from "@/contexts/SupabaseDataContext";
import { useToast } from "@/components/ui/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Edit, Trash2, Plus, Package, Wrench, Wifi } from "lucide-react";
import { formatCurrencyBR } from "@/lib/utils";
import ProductDetailsDialog from "@/components/products/ProductDetailsDialog";

/**
 * ProductsList
 * - Se receber `items` (array) => modo Voalle/BFF (NÃO usa SupabaseDataContext)
 * - Se NÃO receber `items` => modo Local/Supabase (usa SupabaseDataContext)
 */
export default function ProductsList({ items = null }) {
  if (Array.isArray(items)) {
    return <ProductsListVoalle items={items} />;
  }
  return <ProductsListLocal />;
}

/** =========================
 *  MODO VOALLE / BFF
 *  ========================= */
function ProductsListVoalle({ items }) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  const source = useMemo(() => {
    return (items || []).map((p) => {
      // suporta:
      // - Voalle cru: { code, name, price, use, priceListCode, ... }
      // - BFF/DB: { id, cod, description, sale_price, type, source, use, ... }
      const use = String(p?.use || "").toUpperCase();
      // tenta extrair código de várias fontes (inclusive id "COD-xx-yy")
      const codRaw = String(p?.cod ?? p?.code ?? p?.codigo ?? "").trim();
      const codFromId = String(p?.id || "").split("-")[0].trim();
      const cod = codRaw || codFromId;

      // descrição pode vir como description/name/title
      const description = String(p?.description ?? p?.name ?? p?.title ?? p?.descricao ?? "").trim();

      // preço pode vir como sale_price/price/originalPrice/sellingPrice etc.
      const sale_price = Number(
        p?.sale_price ??
          p?.salePrice ??
          p?.price ??
          p?.originalPrice ??
          p?.sellingPrice ??
          p?.minimumPromotionalPrice ??
          0
      );

      const type =
        String(p?.type || "").toUpperCase() ||
        (use === "P" ? "PRODUTO" : use === "R" ? "SERVICO" : "SERVICO_SCM");

      return {
        id:
          p?.id ||
          `${cod}-${p?.priceListCode || p?.price_list_code || "00"}-${
            p?.campaignCode || p?.campaign_code || "00"
          }`,
        cod,
        description,
        type,
        unit: p?.unit ?? p?.unidade ?? "-",
        sale_price: Number.isFinite(sale_price) ? sale_price : 0,
        source: p?.source || "voalle",
        use,
        paymentForm: p?.paymentForm ?? p?.payment_form ?? "",
        paymentFormCode: p?.paymentFormCode ?? p?.payment_form_code ?? "",
        priceListTitle: p?.priceListTitle ?? p?.price_list_title ?? "",
        campaignTitle: p?.campaignTitle ?? p?.campaign_title ?? "",
      };
    });
  }, [items]);

  const openDetails = (p) => {
    setSelected(p);
    setDetailsOpen(true);
  };

  return (
    <div className="p-4 md:p-6">
      <div className="overflow-x-auto rounded-lg border border-slate-800">
        <table className="min-w-full text-sm text-slate-200">
          <thead className="bg-slate-800/60 text-slate-400">
            <tr>
              <th className="p-3 text-left font-semibold">Código</th>
              <th className="p-3 text-left font-semibold">Descrição</th>
              <th className="p-3 text-center font-semibold">Tipo</th>
              <th className="p-3 text-center font-semibold">Unidade</th>
              <th className="p-3 text-right font-semibold">Valor Venda/Serviço</th>
              <th className="p-3 w-32"></th>
            </tr>
          </thead>

          <tbody>
            {source.map((p) => (
              <tr
                key={p.id}
                className="border-t border-slate-800 hover:bg-slate-800/40 transition-colors cursor-pointer"
                onClick={() => openDetails(p)}
              >
                <td className="p-3">{p.cod}</td>

                <td className="p-3 font-medium text-slate-100">
                  {p.description}
                  {(p.priceListTitle || p.campaignTitle) ? (
                    <div className="text-xs text-slate-400 mt-1">
                      {p.priceListTitle ? `Lista: ${p.priceListTitle}` : ""}
                      {p.campaignTitle ? ` • Campanha: ${p.campaignTitle}` : ""}
                    </div>
                  ) : null}
                </td>

                <td className="p-3 text-center">
                  <span
                    className={`inline-flex items-center gap-x-1.5 px-2 py-1 text-xs font-medium rounded-full ${
                      p.type === "PRODUTO"
                        ? "bg-cyan-500/20 text-cyan-300"
                        : p.type === "SERVICO"
                        ? "bg-purple-500/20 text-purple-300"
                        : "bg-amber-500/20 text-amber-300"
                    }`}
                  >
                    {p.type === "PRODUTO" && <Package className="w-3 h-3" />}
                    {p.type === "SERVICO" && <Wrench className="w-3 h-3" />}
                    {p.type === "SERVICO_SCM" && <Wifi className="w-3 h-3" />}
                    {p.type === "SERVICO_SCM" ? "SERVIÇO SCM" : p.type}
                  </span>
                </td>

                <td className="p-3 text-center">{p.unit || "N/A"}</td>

                <td className="p-3 text-right font-mono">
                  {formatCurrencyBR(p.sale_price)}
                </td>

                <td className="p-3 text-right">
                  {/* Sem ações no modo Voalle */}
                </td>
              </tr>
            ))}

            {source.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-500">
                  Nenhum item encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ProductDetailsDialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        product={selected}
      />
    </div>
  );
}

/** =========================
 *  MODO LOCAL / SUPABASE
 *  ========================= */
function ProductsListLocal() {
  const { products, addProduct, removeProduct } = useData();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  const handleSave = (payload) => {
    addProduct(payload);
    toast({
      title: payload.id ? "Item atualizado!" : "Item criado!",
      description: `O item "${payload.description}" foi salvo com sucesso.`,
    });
    setOpen(false);
    setEditing(null);
  };

  const handleEdit = (product) => {
    setEditing(product);
    setOpen(true);
  };

  const handleDelete = (id, name) => {
    removeProduct(id);
    toast({
      variant: "destructive",
      title: "Item excluído!",
      description: `O item "${name}" foi removido.`,
    });
  };

  const openDetails = (p) => {
    setSelected(p);
    setDetailsOpen(true);
  };

  const list = products ?? [];

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-end mb-6">
        <Button
          className="btn-primary"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Item
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-800">
        <table className="min-w-full text-sm text-slate-200">
          <thead className="bg-slate-800/60 text-slate-400">
            <tr>
              <th className="p-3 text-left font-semibold">Código</th>
              <th className="p-3 text-left font-semibold">Descrição</th>
              <th className="p-3 text-center font-semibold">Tipo</th>
              <th className="p-3 text-center font-semibold">Unidade</th>
              <th className="p-3 text-right font-semibold">Valor Venda/Serviço</th>
              <th className="p-3 w-32"></th>
            </tr>
          </thead>

          <tbody>
            {list.map((p) => (
              <tr
                key={p.id}
                className="border-t border-slate-800 hover:bg-slate-800/40 transition-colors cursor-pointer"
                onClick={() => openDetails(p)}
              >
                <td className="p-3">{p.cod}</td>

                <td className="p-3 font-medium text-slate-100">{p.description}</td>

                <td className="p-3 text-center">
                  <span
                    className={`inline-flex items-center gap-x-1.5 px-2 py-1 text-xs font-medium rounded-full ${
                      p.type === "PRODUTO"
                        ? "bg-cyan-500/20 text-cyan-300"
                        : p.type === "SERVICO"
                        ? "bg-purple-500/20 text-purple-300"
                        : "bg-amber-500/20 text-amber-300"
                    }`}
                  >
                    {p.type === "PRODUTO" && <Package className="w-3 h-3" />}
                    {p.type === "SERVICO" && <Wrench className="w-3 h-3" />}
                    {p.type === "SERVICO_SCM" && <Wifi className="w-3 h-3" />}
                    {p.type === "SERVICO_SCM" ? "SERVIÇO SCM" : p.type}
                  </span>
                </td>

                <td className="p-3 text-center">{p.unit || "N/A"}</td>

                <td className="p-3 text-right font-mono">
                  {formatCurrencyBR(p.sale_price)}
                </td>

                <td className="p-3 text-right">
                  <div className="flex gap-2 justify-end">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(p);
                      }}
                      className="text-slate-400 hover:text-blue-400"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-slate-400 hover:text-red-400"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>

                      <AlertDialogContent className="glass-effect border-slate-700 text-slate-200">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="flex items-center text-slate-100">
                            <Trash2 className="w-5 h-5 mr-2 text-red-400" />
                            Confirmar Exclusão
                          </AlertDialogTitle>
                          <AlertDialogDescription className="text-slate-400">
                            Tem certeza que deseja excluir o item "{p.description}"?
                            Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>

                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(p.id, p.description)}
                            className="bg-red-500 hover:bg-red-600"
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </td>
              </tr>
            ))}

            {list.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-500">
                  Nenhum item encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ProductCreateDialog
        open={open}
        onOpenChange={setOpen}
        product={editing}
        onSave={handleSave}
      />

      <ProductDetailsDialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        product={selected}
        onEdit={(p) => {
          setDetailsOpen(false);
          handleEdit(p);
        }}
        onDelete={(p) => {
          setDetailsOpen(false);
          handleDelete(p.id, p.description);
        }}
      />
    </div>
  );
}
