import React, { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

const BFF_URL = import.meta.env.VITE_BFF_URL || "http://localhost:3000";

function parseBRNumber(v) {
  const s = String(v ?? "").trim().replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Cria produto MANUAL no BFF (SQLite do CotaFácil).
 * Endpoint esperado: POST /api/products
 * Payload: { cod, description, type, unit, sale_price, active }
 */
export default function ProductCreateDialogBff({ open, onOpenChange, onSaved }) {
  const { toast } = useToast();

  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    code: "",
    name: "",
    price: "",
    unit: "",
    use: "P", // P = Produto, R/S = Serviço
  });

  useEffect(() => {
    if (!open) {
      setForm({ code: "", name: "", price: "", unit: "", use: "P" });
      setSaving(false);
    }
  }, [open]);

  async function handleSave() {
    const token = localStorage.getItem("token");
    if (!token) {
      toast({ variant: "destructive", title: "Token ausente", description: "Faça login novamente." });
      return;
    }

    const cod = String(form.code || "").trim();
    const description = String(form.name || "").trim();
    if (!cod || !description) {
      toast({ variant: "destructive", title: "Preencha os campos", description: "Código e Nome são obrigatórios." });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        cod,
        description,
        type: String(form.use || "P").toUpperCase() === "P" ? "PRODUTO" : "SERVICO",
        unit: form.unit ? String(form.unit).trim() : null,
        sale_price: parseBRNumber(form.price),
        active: true,
      };

      const r = await fetch(`${BFF_URL}/api/products`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const j = await r.json().catch(() => ({}));
      if (!r.ok || j.ok === false) {
        throw new Error(j.message || "Falha ao salvar produto");
      }

      toast({ title: "Produto criado" });
      onSaved?.(j.item || null);
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: String(e?.message || e),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-effect border-slate-700 text-slate-200">
        <DialogHeader>
          <DialogTitle className="text-slate-100">Adicionar produto</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>Código</Label>
            <Input
              className="input-field"
              value={form.code}
              onChange={(e) => setForm((s) => ({ ...s, code: e.target.value }))}
              placeholder="Ex: 00993"
            />
          </div>

          <div className="grid gap-2">
            <Label>Nome</Label>
            <Input
              className="input-field"
              value={form.name}
              onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
              placeholder="Ex: CONECTOR RJ45 CAT6"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="grid gap-2">
              <Label>Tipo</Label>
              <select
                className="w-full bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-2 outline-none"
                value={form.use}
                onChange={(e) => setForm((s) => ({ ...s, use: e.target.value }))}
              >
                <option value="P">Produto</option>
                <option value="R">Serviço/Plano</option>
                <option value="S">Serviço</option>
              </select>
            </div>

            <div className="grid gap-2">
              <Label>Unidade</Label>
              <Input
                className="input-field"
                value={form.unit}
                onChange={(e) => setForm((s) => ({ ...s, unit: e.target.value }))}
                placeholder="Ex: UN"
              />
            </div>

            <div className="grid gap-2">
              <Label>Preço</Label>
              <Input
                className="input-field"
                value={form.price}
                onChange={(e) => setForm((s) => ({ ...s, price: e.target.value }))}
                placeholder="Ex: 4,72"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange?.(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
