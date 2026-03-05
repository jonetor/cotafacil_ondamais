// bff-node/fiscal/parseCte.js
import { XMLParser } from "fast-xml-parser";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  removeNSPrefix: true
});

const onlyDigits = (s) => String(s || "").replace(/\D/g, "");

/**
 * Tenta extrair informações úteis de:
 * - procCTe (CT-e completo)
 * - resCTe (resumo)  (se vier)
 * - eventos (fallback -> salva xml em resumo_xml)
 */
export function parseCteDocXml(xml) {
  const j = parser.parse(xml);

  // Alguns retornos vêm como cteProc (padrão) ou procCTe (varia por schema/lib)
  const proc = j?.cteProc || j?.procCTe;

  if (proc?.CTe?.infCte) {
    const inf = proc.CTe.infCte;
    const ide = inf?.ide || {};
    const vPrest = inf?.vPrest || {};
    const emit = inf?.emit || {};
    const dest = inf?.dest || {};
    const toma4 = inf?.toma4 || {};

    const chave = inf?.["@_Id"] ? String(inf["@_Id"]).replace(/^CTe/i, "") : null;

    // Tomador pode ser o interessado em muitos casos; guardamos o dest também.
    const tomadorCnpj =
      onlyDigits(toma4?.toma?.CNPJ || toma4?.CNPJ) || null;

    return {
      schema: "procCTe",
      chave,
      emit_cnpj: onlyDigits(emit?.CNPJ) || null,
      dest_cnpj: onlyDigits(dest?.CNPJ) || tomadorCnpj,
      dh_emi: ide?.dhEmi || ide?.dhCont || null,
      valor: vPrest?.vTPrest ? Number(vPrest.vTPrest) : null,
      resumo_xml: null,
      xml_completo: xml
    };
  }

  // Resumo (se vier)
  const resCTe = j?.resCTe;
  if (resCTe) {
    return {
      schema: "resCTe",
      chave: resCTe?.chCTe || resCTe?.chCTeOS || null,
      emit_cnpj: onlyDigits(resCTe?.CNPJ || resCTe?.CPF) || null,
      dest_cnpj: onlyDigits(resCTe?.CNPJDest) || null,
      dh_emi: resCTe?.dhEmi || null,
      valor: resCTe?.vCT ? Number(resCTe.vCT) : null,
      resumo_xml: xml,
      xml_completo: null
    };
  }

  // fallback: evento/qualquer outro docZip
  return {
    schema: "unknown",
    chave: null,
    emit_cnpj: null,
    dest_cnpj: null,
    dh_emi: null,
    valor: null,
    resumo_xml: xml,
    xml_completo: null
  };
}