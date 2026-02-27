import React, { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileDown, X } from "lucide-react";
import { format } from "date-fns";
import { cnpjMask, cpfMask, phoneMask } from "@/lib/masks";

const safeText = (t) => (t === 0 ? "0" : t ? String(t) : "");
const onlyDigits = (s) => String(s || "").replace(/\D/g, "");

const formatCurrency = (value) =>
  (Number(value) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function normalizePreview(quote) {
  const proposal = quote?.proposal_number ?? quote?.proposta_numero ?? "";
  const revision = quote?.revision ?? quote?.revisao ?? 0;
  const createdAt = quote?.created_at ? new Date(quote.created_at) : new Date();
  const createdAtStr = format(createdAt, "dd/MM/yyyy");
  const total = quote?.total_geral ?? quote?.total_value ?? 0;
  return { proposal, revision, createdAtStr, total };
}

export default function QuotePDFPreviewDialog({ isOpen, onClose, onConfirm, previewData }) {
  const [template, setTemplate] = useState("orcamento"); // "orcamento" | "proposta"

  const canRender = Boolean(isOpen && previewData?.quote && previewData?.company && previewData?.client);
  const q = useMemo(() => normalizePreview(previewData?.quote || {}), [previewData]);

  if (!canRender) return null;

  const quote = previewData.quote;
  const company = previewData.company;
  const client = previewData.client;
  const vendedor = previewData.vendedor;

  const companyAddr = company?.addresses?.[0] || {};
  const clientAddr = client?.addresses?.[0] || {};

  const clientDoc = client?.cpf_cnpj || client?.document || client?.txIdFormated || client?.txId || "";
  const isPF = onlyDigits(clientDoc).length <= 11 || client?.tipo_pessoa === "PF";

  return (
    <Dialog open={isOpen} onOpenChange={(v) => !v && onClose?.()}>
      <DialogContent className="glass-effect border-white/20 text-white max-w-5xl">
        <DialogHeader>
          <DialogTitle className="text-white">Pré-visualização do PDF</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          {/* seletor de modelo */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={template === "orcamento" ? "default" : "secondary"}
              className={template === "orcamento" ? "btn-primary" : "btn-secondary"}
              onClick={() => setTemplate("orcamento")}
            >
              Orçamento
            </Button>

            <Button
              type="button"
              variant={template === "proposta" ? "default" : "secondary"}
              className={template === "proposta" ? "btn-primary" : "btn-secondary"}
              onClick={() => setTemplate("proposta")}
            >
              Proposta Comercial
            </Button>
          </div>

          <div className="floating-card p-4 space-y-3">
            <div className="text-sm text-white/70">
              <div>
                <b>Tipo:</b> {template === "proposta" ? "Proposta Comercial" : "Orçamento"}
              </div>
              <div>
                <b>Nº:</b> {safeText(q.proposal || "-")} • <b>Revisão:</b> {safeText(q.revision)} •{" "}
                <b>Data:</b> {safeText(q.createdAtStr)}
              </div>
              <div>
                <b>Total:</b> {formatCurrency(q.total)}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <div className="font-semibold text-white">Fornecedor</div>
                <div>{safeText(company?.name)}</div>
                <div>CNPJ: {cnpjMask(company?.cnpj)}</div>
                {company?.ie ? <div>IE: {safeText(company.ie)}</div> : null}
                <div>
                  Endereço:{" "}
                  {`${safeText(companyAddr.logradouro)}, ${safeText(companyAddr.numero)} - ${safeText(
                    companyAddr.bairro
                  )} ${companyAddr.cidade ? `| ${companyAddr.cidade}/${companyAddr.uf}` : ""}`}
                </div>
                <div>Email: {safeText(company?.email)} | Tel: {phoneMask(company?.phone)}</div>
              </div>

              <div className="space-y-1">
                <div className="font-semibold text-white">Cliente</div>
                <div>{safeText(client?.nome_razao || client?.name)}</div>
                <div>CNPJ/CPF: {isPF ? cpfMask(clientDoc) : cnpjMask(clientDoc)}</div>
                <div>
                  Endereço:{" "}
                  {`${safeText(clientAddr.logradouro)}, ${safeText(clientAddr.numero)} - ${safeText(
                    clientAddr.bairro
                  )} ${clientAddr.cidade ? `| ${clientAddr.cidade}/${clientAddr.uf}` : ""}`}
                </div>
                <div>Email: {safeText(client?.email)} | Tel: {phoneMask(client?.telefone)}</div>
                {quote?.contactPerson ? <div>Aos Cuidados: {safeText(quote.contactPerson)}</div> : null}
              </div>
            </div>

            {vendedor ? (
              <div className="text-sm text-white/70 border-t border-white/10 pt-3">
                <div className="font-semibold text-white">Vendedor</div>
                <div>
                  {safeText(vendedor?.name || vendedor?.nome)}{" "}
                  {vendedor?.email ? `| Email: ${safeText(vendedor.email)}` : ""}{" "}
                  {vendedor?.telefone ? `| Tel: ${phoneMask(vendedor.telefone)}` : ""}
                </div>
              </div>
            ) : null}
          </div>

          <div className="text-xs text-white/50">
            Clique em <b>“Baixar PDF”</b> para gerar o arquivo com o modelo selecionado.
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="secondary" className="btn-secondary" onClick={onClose}>
            <X className="w-4 h-4 mr-2" /> Fechar
          </Button>

          <Button
            type="button"
            className="btn-primary"
            onClick={() => onConfirm?.(template)}
          >
            <FileDown className="w-4 h-4 mr-2" /> Baixar PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}