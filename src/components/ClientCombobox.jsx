import React, { useMemo, useState } from "react";
import { ChevronsUpDown, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { cn } from "@/lib/utils";

function labelForClient(c) {
  const name = c?.name || c?.nome_razao || c?.nome_fantasia || "";
  const doc = c?.cpf_cnpj_digits || c?.cpf_cnpj || c?.document || "";
  return doc ? `${name} (${doc})` : name;
}

export default function ClientCombobox({
  clients = [],
  value,          // id selecionado
  onChange,       // (id, clientObj) => void
  placeholder = "Selecione o cliente",
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const selected = useMemo(() => clients.find((c) => String(c.id) === String(value)), [clients, value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          disabled={disabled}
          aria-expanded={open}
          className="w-full justify-between input-field"
        >
          <span className="truncate">
            {selected ? labelForClient(selected) : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 opacity-60 shrink-0" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[420px] p-0 glass-effect border-white/20">
        <Command>
          <CommandInput placeholder="Pesquisar cliente..." />
          <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>

          <CommandGroup className="max-h-72 overflow-auto">
            {clients.map((c) => {
              const id = String(c.id);
              const label = labelForClient(c);

              return (
                <CommandItem
                  key={id}
                  value={`${label} ${id}`}
                  onSelect={() => {
                    onChange?.(id, c);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", String(value) === id ? "opacity-100" : "opacity-0")} />
                  <span className="truncate">{label}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}