import { XMLParser } from "fast-xml-parser";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  removeNSPrefix: true
});

const onlyDigits = (s) => String(s || "").replace(/\D/g, "");

export function parseNfeDocXml(xml) {
  const j = parser.parse(xml);

  const resNFe = j?.resNFe;
  if (resNFe) {
    return {
      schema: "resNFe",
      chave: resNFe?.chNFe || null,
      emit_cnpj: onlyDigits(resNFe?.CNPJ || resNFe?.CPF),
      dest_cnpj: onlyDigits(resNFe?.CNPJDest),
      dh_emi: resNFe?.dhEmi || null,
      valor: resNFe?.vNF ? Number(resNFe.vNF) : null,
      resumo_xml: xml,
      xml_completo: null
    };
  }

  const proc = j?.nfeProc;
  if (proc?.NFe?.infNFe) {
    const inf = proc.NFe.infNFe;
    const ide = inf?.ide || {};
    const emit = inf?.emit || {};
    const dest = inf?.dest || {};
    const tot = inf?.total?.ICMSTot || {};
    const chave = inf?.["@_Id"] ? String(inf["@_Id"]).replace(/^NFe/, "") : null;

    return {
      schema: "procNFe",
      chave,
      emit_cnpj: onlyDigits(emit?.CNPJ || emit?.CPF),
      dest_cnpj: onlyDigits(dest?.CNPJ || dest?.CPF),
      dh_emi: ide?.dhEmi || null,
      valor: tot?.vNF ? Number(tot.vNF) : null,
      resumo_xml: null,
      xml_completo: xml
    };
  }

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