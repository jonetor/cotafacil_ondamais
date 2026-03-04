import React, { useMemo, useState } from "react";
import { ChevronsUpDown, Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const onlyDigits = (s) => String(s || "").replace(/\D/g, "");
const norm = (s) =>
  String(s || "")
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

export default function ClientSearchSelect({
  items = [],
  value = "",
  onValueChange,
  placeholder = "Selecione o cliente",
  getId = (x) => String(x?.id ?? ""),
  getLabel = (x) => String(x?.name ?? ""),
  // ✅ opcional: texto extra para busca (doc digits, id, email, etc)
  getSearchText,
  icon = null,
  disabled = false,
  widthClassName = "w-full",
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const selected = useMemo(() => {
    const v = String(value || "");
    return items.find((it) => String(getId(it)) === v) || null;
  }, [items, value, getId]);

  const filtered = useMemo(() => {
    const raw = String(q || "").trim();
    if (!raw) return items;

    const qNorm = norm(raw);
    const qDigits = onlyDigits(raw);

    return items.filter((it) => {
      const id = String(getId(it) || "");
      const label = String(getLabel(it) || "");

      const extra = typeof getSearchText === "function" ? String(getSearchText(it) || "") : "";

      const hay = norm(`${id} ${label} ${extra}`);
      if (hay.includes(qNorm)) return true;

      // ✅ também tenta por dígitos (cpf/cnpj digitado “93”, “1442…”, etc)
      if (qDigits) {
        const hayDigits = onlyDigits(`${id} ${label} ${extra}`);
        if (hayDigits.includes(qDigits)) return true;
      }

      return false;
    });
  }, [items, q, getId, getLabel, getSearchText]);

  const selectedLabel = selected ? getLabel(selected) : "";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn("justify-between input-field", widthClassName)}
          aria-expanded={open}
        >
          <span className="flex items-center gap-2 min-w-0">
            {icon}
            <span className="truncate">{selectedLabel || placeholder}</span>
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 opacity-60 shrink-0" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="p-3 glass-effect border-white/20 w-[520px]">
        <div className="space-y-3">
          <Input
            autoFocus
            className="input-field"
            placeholder="Pesquisar cliente..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />

          <div className="max-h-72 overflow-auto rounded-md border border-white/10">
            {filtered.length === 0 ? (
              <div className="p-3 text-sm text-white/60">Nenhum cliente encontrado.</div>
            ) : (
              <ul className="divide-y divide-white/10">
                {filtered.map((it) => {
                  const id = String(getId(it));
                  const label = String(getLabel(it));
                  const isSel = String(value || "") === id;

                  return (
                    <li key={id}>
                      <button
                        type="button"
                        className={cn(
                          "w-full text-left px-3 py-2 hover:bg-white/5 flex items-center gap-2",
                          isSel && "bg-white/5"
                        )}
                        onClick={() => {
                          onValueChange?.(id, it);
                          setOpen(false);
                        }}
                      >
                        <Check className={cn("h-4 w-4", isSel ? "opacity-100" : "opacity-0")} />
                        <span className="truncate">{label}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="flex justify-end">
            <Button type="button" variant="secondary" className="btn-secondary" onClick={() => setOpen(false)}>
              Fechar
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}