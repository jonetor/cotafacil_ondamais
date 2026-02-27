import React from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatCurrencyBR } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

function Field({ label, value }) {
  return (
    <div className="space-y-1">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="text-sm text-slate-100 break-words">{value || "-"}</div>
    </div>
  );
}

export default function ProductDetailsDialog({
  open,
  onOpenChange,
  product,
  onEdit,
  onDelete,
}) {
  const p = product;
  const canEditDelete = String(p?.source || "manual") === "manual";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-effect border-slate-700 text-slate-200 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-slate-100">Detalhes do item</DialogTitle>
        </DialogHeader>

        {!p ? (
          <div className="text-sm text-slate-400">Nenhum item selecionado.</div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="bg-slate-800/70 text-slate-200 border border-slate-700">
                {p.type || "-"}
              </Badge>
              {p.use ? (
                <Badge variant="outline" className="border-slate-700 text-slate-200">
                  use: {p.use}
                </Badge>
              ) : null}
              <Badge variant="outline" className="border-slate-700 text-slate-200">
                origem: {p.source || "manual"}
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Código" value={p.cod} />
              <Field label="Unidade" value={p.unit} />
              <Field label="Descrição" value={p.description} />
              <Field label="Preço" value={formatCurrencyBR(Number(p.sale_price || 0))} />
            </div>

            {(p.priceListTitle || p.campaignTitle) ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Lista de preço" value={p.priceListTitle} />
                <Field label="Campanha" value={p.campaignTitle} />
              </div>
            ) : null}

            {p.paymentForm ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Forma de pagamento" value={p.paymentForm} />
                <Field label="Código forma pag." value={p.paymentFormCode} />
              </div>
            ) : null}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          {p && canEditDelete ? (
            <>
              <Button variant="outline" onClick={() => onEdit?.(p)}>
                Editar
              </Button>
              <Button
                variant="destructive"
                onClick={() => onDelete?.(p)}
              >
                Excluir
              </Button>
            </>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
