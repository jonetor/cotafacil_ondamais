// src/components/quotes/QuoteNotes.jsx
import React from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

function QuoteNotes({ formData, handleInputChange }) {
  return (
    <div className="form-section space-y-4">
      <h3 className="text-lg font-semibold text-white">Notas Internas</h3>
      <p className="text-white/60 text-sm">
        Campo opcional para anotações internas (não substitui as informações adicionais que vão para o PDF).
      </p>

      <div>
        <Label htmlFor="internal_notes">Observações internas</Label>
        <Textarea
          name="internal_notes"
          value={formData?.internal_notes || ""}
          onChange={handleInputChange}
          className="input-field w-full h-32 resize-none"
          placeholder="Ex: detalhes da negociação, lembretes, histórico do cliente, etc."
        />
      </div>
    </div>
  );
}

export default QuoteNotes;