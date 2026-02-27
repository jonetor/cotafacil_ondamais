import React from "react";
import { motion } from "framer-motion";
import { Pencil, Trash2, MapPin, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";

function safeText(v) {
  return String(v ?? "").trim();
}

export default function ClientCard({ client, index = 0, onSelect, onEdit, onDelete }) {
  const nome = safeText(client?.nome_razao);
  const fantasia = safeText(client?.fantasia);
  const doc = safeText(client?.cpf_cnpj);
  const city = safeText(client?.city);
  const state = safeText(client?.state);
  const email = safeText(client?.email);
  const telefone = safeText(client?.telefone);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.25) }}
      role="button"
      tabIndex={0}
      onClick={() => onSelect?.(client)}
      onKeyDown={(e) => {
        if (e.key === "Enter") onSelect?.(client);
      }}
      className="cursor-pointer hover:scale-[1.02] transition floating-card p-5 space-y-3"
      title="Clique para selecionar este cliente para a cotação"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-slate-100 font-semibold text-base truncate">
            {nome || "Sem nome"}
          </div>
          {fantasia ? <div className="text-slate-400 text-sm truncate">{fantasia}</div> : null}
          {doc ? <div className="text-slate-300 text-sm mt-1">{doc}</div> : null}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="text-slate-300 hover:text-slate-100"
            title="Editar"
            onClick={(e) => {
              e.stopPropagation();
              onEdit?.(client);
            }}
          >
            <Pencil className="w-4 h-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="text-red-300 hover:text-red-200"
            title="Excluir"
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.(client?.id);
            }}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-2 text-sm text-slate-400">
        {(city || state) && (
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            <span className="truncate">
              {city}
              {state ? ` - ${state}` : ""}
            </span>
          </div>
        )}

        {email && (
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4" />
            <span className="truncate">{email}</span>
          </div>
        )}

        {telefone && (
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4" />
            <span className="truncate">{telefone}</span>
          </div>
        )}
      </div>

      <div className="pt-2 border-t border-slate-700/60">
        <span className="text-xs text-slate-500">Clique para selecionar para cotação</span>
      </div>
    </motion.div>
  );
}