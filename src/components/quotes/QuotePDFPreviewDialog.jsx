import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileDown, Printer, X } from "lucide-react";

export default function QuotePDFPreviewDialog({
  isOpen,
  onClose,
  onConfirm,
  previewData,
}) {
  const [busy, setBusy] = useState(false);

  if (!isOpen) return null;

  const run = async (fn) => {
    try {
      setBusy(true);
      await fn();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(v) => !v && onClose?.()}>
      <DialogContent className="glass-effect border-white/20 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle>Gerar PDF da Cotação</DialogTitle>
        </DialogHeader>

        <div className="py-4 text-sm text-white/70">
          Clique em <b>Baixar PDF</b> ou <b>Imprimir</b>.
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={busy}
          >
            <X className="w-4 h-4 mr-2" /> Fechar
          </Button>

          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() =>
              run(() => onConfirm?.("orcamento", { action: "print" }))
            }
          >
            <Printer className="w-4 h-4 mr-2" /> Imprimir
          </Button>

          <Button
            type="button"
            disabled={busy}
            onClick={() =>
              run(() => onConfirm?.("orcamento", { action: "download" }))
            }
          >
            <FileDown className="w-4 h-4 mr-2" /> Baixar PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}