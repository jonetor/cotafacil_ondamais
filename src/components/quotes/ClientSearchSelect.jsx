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

function defaultSearchText(x) {
  return [
    x?.id,
    x?.name,
    x?.nome,
    x?.razao_social,
    x?.razaoSocial,
    x?.nome_razao,
    x?.nome_fantasia,
    x?.fantasia,
    x?.cpf,
    x?.cnpj,
    x?.cpf_cnpj,
    x?.cpf_cnpj_digits,
    x?.document,
    x?.txId,
    x?.txIdFormated,
    x?.email,
    x?.telefone,
    x?.phone,
    x?.city,
    x?.state,
    x?.bairro,
    x?.endereco,
    x?.logradouro,
    x?.numero,
  ]
    .filter(Boolean)
    .join(" ");
}

export default function ClientSearchSelect({
  items = [],
  value = "",
  onValueChange,
  placeholder = "Selecione o cliente",
  getId = (x) => String(x?.id ?? ""),
  getLabel = (x) =>
    String(
      x?.name ||
        x?.nome ||
        x?.nome_razao ||
        x?.nome_fantasia ||
        x?.razao_social ||
        "Cliente sem nome"
    ),
  getSearchText,
  icon = null,
  disabled = false,
  widthClassName = "w-full",
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const uniqueItems = useMemo(() => {
    const map = new Map();

    for (const item of Array.isArray(items) ? items : []) {
      const id = String(getId(item) || "");
      if (!id) continue;
      if (!map.has(id)) map.set(id, item);
    }

    return Array.from(map.values());
  }, [items, getId]);

  const selected = useMemo(() => {
    const v = String(value || "");
    return uniqueItems.find((it) => String(getId(it)) === v) || null;
  }, [uniqueItems, value, getId]);

  const filtered = useMemo(() => {
    const raw = String(q || "").trim();
    if (!raw) return uniqueItems.slice(0, 100);

    const qNorm = norm(raw);
    const qDigits = onlyDigits(raw);

    return uniqueItems
      .filter((it) => {
        const id = String(getId(it) || "");
        const label = String(getLabel(it) || "");
        const extra =
          typeof getSearchText === "function"
            ? String(getSearchText(it) || "")
            : defaultSearchText(it);

        const hay = norm(`${id} ${label} ${extra}`);
        if (hay.includes(qNorm)) return true;

        if (qDigits) {
          const hayDigits = onlyDigits(`${id} ${label} ${extra}`);
          if (hayDigits.includes(qDigits)) return true;
        }

        return false;
      })
      .slice(0, 100);
  }, [uniqueItems, q, getId, getLabel, getSearchText]);

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

      <PopoverContent className="p-3 glass-effect border-white/20 w-[var(--radix-popover-trigger-width)] min-w-[320px] max-w-[620px]">
        <div className="space-y-3">
          <Input
            autoFocus
            className="input-field"
            placeholder="Pesquisar cliente por nome, CPF/CNPJ, e-mail..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />

          <div className="max-h-80 overflow-auto rounded-md border border-white/10">
            {filtered.length === 0 ? (
              <div className="p-3 text-sm text-white/60">Nenhum cliente encontrado.</div>
            ) : (
              <ul className="divide-y divide-white/10">
                {filtered.map((it) => {
                  const id = String(getId(it));
                  const label = String(getLabel(it));
                  const isSel = String(value || "") === id;
                  const sub =
                    it?.cpf_cnpj ||
                    it?.cpf_cnpj_digits ||
                    it?.txIdFormated ||
                    it?.txId ||
                    it?.document ||
                    it?.email ||
                    "";

                  return (
                    <li key={id}>
                      <button
                        type="button"
                        className={cn(
                          "w-full text-left px-3 py-2 hover:bg-white/5 flex items-start gap-2",
                          isSel && "bg-white/5"
                        )}
                        onClick={() => {
                          onValueChange?.(id, it);
                          setOpen(false);
                          setQ("");
                        }}
                      >
                        <Check
                          className={cn(
                            "h-4 w-4 mt-0.5 shrink-0",
                            isSel ? "opacity-100" : "opacity-0"
                          )}
                        />

                        <div className="min-w-0">
                          <div className="truncate">{label}</div>
                          <div className="truncate text-xs text-white/50">{sub}</div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="flex justify-between items-center text-xs text-white/50">
            <span>Total carregado: {uniqueItems.length}</span>
            <Button
              type="button"
              variant="secondary"
              className="btn-secondary"
              onClick={() => setOpen(false)}
            >
              Fechar
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}