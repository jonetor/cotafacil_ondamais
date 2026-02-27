import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { cpfMask, cnpjMask } from "@/lib/masks";

function formatCpfCnpj(raw) {
  const digits = String(raw || "").replace(/\D/g, "");
  if (digits.length === 11) return cpfMask(digits);
  if (digits.length === 14) return cnpjMask(digits);
  return raw || "-";
}

export default function ClientDetailsDialog({ open, onOpenChange, client, onGoToQuote }) {
  const nome = client?.nome_razao || client?.nome_fantasia || client?.name || "-";
  const doc = formatCpfCnpj(client?.cpf_cnpj || client?.cpf_cnpj_digits);
  const email = client?.email || client?.email_principal || "-";
  const phone = client?.telefone || client?.telefone_principal || client?.celular || "-";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-effect border-slate-700 text-slate-200 max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-slate-100">Detalhes do cliente</DialogTitle>
          <DialogDescription className="text-slate-400">
            Informações do cadastro do cliente.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-slate-400">Nome/Razão</div>
            <div className="text-sm text-slate-100 font-medium break-words">{nome}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400">CPF/CNPJ</div>
            <div className="text-sm text-slate-100 font-medium">{doc}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Email</div>
            <div className="text-sm text-slate-100 font-medium break-words">{email}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Telefone</div>
            <div className="text-sm text-slate-100 font-medium">{phone}</div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button className="btn-primary" onClick={onGoToQuote} disabled={!client}>
            <ArrowRight className="w-4 h-4 mr-2" /> Levar para a cotação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
