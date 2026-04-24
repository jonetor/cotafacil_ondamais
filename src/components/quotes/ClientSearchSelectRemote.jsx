// src/components/quotes/ClientSearchSelectRemote.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Search, Check, ChevronsUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function onlyDigits(s) {
  return String(s || "").replace(/\D/g, "");
}

function getClientLabel(client) {
  if (!client) return "";
  return String(
    client?.name ||
      client?.nome_razao ||
      client?.nome ||
      client?.nome_fantasia ||
      ""
  );
}

export default function ClientSearchSelectRemote({
  value = null,
  onChange,
  placeholder = "Pesquisar cliente",
  className = "",
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const boxRef = useRef(null);

  const selectedLabel = useMemo(() => getClientLabel(value), [value]);

  useEffect(() => {
    if (!open) {
      setQuery(selectedLabel || "");
    }
  }, [selectedLabel, open]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function searchClients() {
      const q = String(query || "").trim();

      if (!open || q.length < 2) {
        setItems([]);
        return;
      }

      try {
        setLoading(true);

        const res = await fetch(
          `/api/voalle/clientes-db?q=${encodeURIComponent(q)}&limit=20`,
          {
            method: "GET",
            signal: controller.signal,
          }
        );

        const data = await res.json().catch(() => ({}));
        const list = Array.isArray(data?.items)
          ? data.items
          : Array.isArray(data)
          ? data
          : [];

        setItems(list);
      } catch (e) {
        if (e?.name !== "AbortError") {
          setItems([]);
        }
      } finally {
        setLoading(false);
      }
    }

    const t = setTimeout(searchClients, 250);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [query, open]);

  return (
    <div ref={boxRef} className={cn("relative w-full", className)}>
      <button
        type="button"
        className="input-field w-full flex items-center justify-between text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="flex items-center gap-2 min-w-0">
          <Search className="w-4 h-4 opacity-60 shrink-0" />
          <span className="truncate">{selectedLabel || placeholder}</span>
        </span>
        <ChevronsUpDown className="w-4 h-4 opacity-60 shrink-0" />
      </button>

      {open && (
        <div className="absolute z-50 mt-2 w-full rounded-xl border border-white/10 bg-[#020817] shadow-2xl p-3">
          <Input
            autoFocus
            className="input-field"
            placeholder="Digite nome, CPF ou CNPJ..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          <div className="mt-3 max-h-72 overflow-auto rounded-md border border-white/10">
            {loading ? (
              <div className="p-3 text-sm text-white/60">Pesquisando...</div>
            ) : items.length === 0 ? (
              <div className="p-3 text-sm text-white/60">
                Nenhum cliente encontrado.
              </div>
            ) : (
              <ul className="divide-y divide-white/10">
                {items.map((client) => {
                  const id = String(client?.id ?? "");
                  const label = getClientLabel(client);
                  const doc =
                    client?.cpf_cnpj ||
                    client?.txIdFormated ||
                    client?.txId ||
                    client?.document ||
                    "";

                  const valueDoc = onlyDigits(
                    value?.cpf_cnpj ||
                      value?.txIdFormated ||
                      value?.txId ||
                      value?.document ||
                      ""
                  );

                  const itemDoc = onlyDigits(doc);

                  const isSelected =
                    String(value?.id || "") === id ||
                    (valueDoc && itemDoc && valueDoc === itemDoc);

                  return (
                    <li key={id}>
                      <button
                        type="button"
                        className={cn(
                          "w-full text-left px-3 py-2 hover:bg-white/5 flex items-start gap-2",
                          isSelected && "bg-white/5"
                        )}
                        onClick={() => {
                          onChange?.(client);
                          setQuery(label);
                          setOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "h-4 w-4 mt-0.5 shrink-0",
                            isSelected ? "opacity-100" : "opacity-0"
                          )}
                        />

                        <span className="min-w-0">
                          <span className="block truncate">{label}</span>
                          {doc ? (
                            <span className="block text-xs text-white/50 truncate">
                              {doc}
                            </span>
                          ) : null}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}