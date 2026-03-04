import React, { useMemo, useState } from "react";
import { BadgeCheck, Building2, ChevronDown, Mail, MapPin, Phone, User2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const onlyDigits = (s) => String(s || "").replace(/\D/g, "");

function safe(v) {
  const s = String(v ?? "").trim();
  return s;
}

function getTipo(doc) {
  const d = onlyDigits(doc);
  return d.length > 11 ? { label: "PJ", Icon: Building2 } : { label: "PF", Icon: User2 };
}

export default function ClientCard({ client, index = 0, onSelect }) {
  const [open, setOpen] = useState(false);

  // Campos que você já tem no payload adaptado no Clients.jsx
  const nome = safe(client?.nome_razao || client?.nome || client?.razao || "Cliente");
  const fantasia = safe(client?.fantasia || client?.nome_fantasia || "");
  const doc = safe(client?.cpf_cnpj || client?.cpfcnpj || client?.documento || "");

  // Campos opcionais (não quebra se não existir)
  const email = safe(client?.email || "");
  const telefone = safe(client?.telefone || client?.celular || client?.fone || "");
  const cidade = safe(client?.cidade || client?.municipio || client?.city || "");
  const uf = safe(client?.uf || client?.estado || client?.state || "");

  const { label: tipoLabel, Icon: TipoIcon } = useMemo(() => getTipo(doc), [doc]);

  return (
    <div
      className="rounded-2xl border border-white/10 bg-slate-950/40 p-5 space-y-3 hover:bg-slate-950/55 transition"
      style={{ animationDelay: `${Math.min(index * 20, 180)}ms` }}
    >
      {/* Cabeçalho clicável */}
      <button
        type="button"
        className="w-full text-left"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                <TipoIcon className="w-3.5 h-3.5" />
                {tipoLabel}
              </span>
              {doc ? <span className="truncate">{doc}</span> : null}
            </div>

            <div className="mt-2 text-slate-100 font-semibold truncate">{nome}</div>
            {fantasia ? (
              <div className="text-slate-400 text-sm truncate">{fantasia}</div>
            ) : (
              <div className="text-slate-500 text-sm">&nbsp;</div>
            )}
          </div>

          <ChevronDown
            className={`w-5 h-5 text-slate-400 shrink-0 transition-transform ${
              open ? "rotate-180" : ""
            }`}
          />
        </div>
      </button>

      {/* Conteúdo expandido */}
      {open ? (
        <div className="pt-3 border-t border-white/10 space-y-3">
          <div className="grid grid-cols-1 gap-3">
            {(cidade || uf) ? (
              <div className="flex items-start gap-2 text-sm text-slate-300">
                <MapPin className="w-4 h-4 mt-0.5 text-slate-400" />
                <div className="min-w-0">
                  <div className="text-xs text-slate-500">Cidade/UF</div>
                  <div className="truncate">{[cidade, uf].filter(Boolean).join(" / ")}</div>
                </div>
              </div>
            ) : null}

            {email ? (
              <div className="flex items-start gap-2 text-sm text-slate-300">
                <Mail className="w-4 h-4 mt-0.5 text-slate-400" />
                <div className="min-w-0">
                  <div className="text-xs text-slate-500">E-mail</div>
                  <div className="truncate">{email}</div>
                </div>
              </div>
            ) : null}

            {telefone ? (
              <div className="flex items-start gap-2 text-sm text-slate-300">
                <Phone className="w-4 h-4 mt-0.5 text-slate-400" />
                <div className="min-w-0">
                  <div className="text-xs text-slate-500">Telefone</div>
                  <div className="truncate">{telefone}</div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex justify-end">
            <Button
              className="btn-primary h-9 px-3"
              onClick={() => onSelect?.(client)}
              title="Selecionar cliente para a cotação"
            >
              <BadgeCheck className="w-4 h-4 mr-2" />
              Selecionar
            </Button>
          </div>
        </div>
      ) : (
        <div className="pt-2 border-t border-white/10">
          <span className="text-xs text-slate-500">Clique para ver detalhes</span>
        </div>
      )}
    </div>
  );
}