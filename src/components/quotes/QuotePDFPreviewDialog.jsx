import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export default function QuotePDFPreviewDialog({
  isOpen,
  onClose,
  previewData,
  onConfirm,
}) {
  const [documentType, setDocumentType] = useState("orcamento");

  const handleConfirm = (action = "download") => {
    onConfirm?.("default", {
      action,
      documentType,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose?.()}>
      <DialogContent className="max-w-lg glass-effect border-white/10 text-white">
        <DialogHeader>
          <DialogTitle>Gerar documento</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-3">
            <Label>Tipo do documento</Label>

<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
  <button
    type="button"
    onClick={() => setDocumentType("orcamento")}
    className={`rounded-xl border px-4 py-3 transition h-[82px] flex items-center justify-center text-center ${
      documentType === "orcamento"
        ? "border-blue-500 bg-blue-500/10"
        : "border-white/10 bg-white/5 hover:bg-white/10"
    }`}
  >
    <span className="font-semibold text-base">ORÇAMENTO</span>
  </button>

  <button
    type="button"
    onClick={() => setDocumentType("proposta_comercial")}
    className={`rounded-xl border px-4 py-3 transition h-[82px] flex items-center justify-center text-center ${
      documentType === "proposta_comercial"
        ? "border-blue-500 bg-blue-500/10"
        : "border-white/10 bg-white/5 hover:bg-white/10"
    }`}
  >
    <span className="font-semibold text-base">PROPOSTA COMERCIAL</span>
  </button>
      </div>
         </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="btn-secondary"
                    onClick={onClose}
                  >
                    Fechar
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className="btn-secondary"
                    onClick={() => handleConfirm("print")}
                  >
                    Imprimir
                  </Button>

                  <Button
                    type="button"
                    className="btn-primary"
                    onClick={() => handleConfirm("download")}
                  >
                    Gerar PDF
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        );
      }