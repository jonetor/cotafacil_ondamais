// bff-node/fiscal/syncCte.js
import { XMLParser } from "fast-xml-parser";
import { db, onlyDigits } from "../db.js";
import { randomUUID } from "node:crypto";
import { FISCAL_MODE, hasA1, loadEndpoints } from "./config.js";
import { callCteDist } from "./cteDist.js";
import * as doczip from "./doczip.js";
import { parseCteDocXml } from "./parseCte.js";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  removeNSPrefix: true
});

const asArray = (x) => (x ? (Array.isArray(x) ? x : [x]) : []);

function getCompanies() {
  return db
    .prepare(`SELECT id, cnpj_digits, name FROM fiscal_companies ORDER BY updated_at DESC`)
    .all();
}

function getCursor(companyId) {
  const row = db
    .prepare(`SELECT last_nsu FROM dfe_cursor WHERE company_id=? AND doc_type='CTE'`)
    .get(companyId);
  return row ? Number(row.last_nsu || 0) : 0;
}

function setCursor(companyId, lastNsu) {
  const now = Date.now();
  db.prepare(`
    INSERT INTO dfe_cursor(company_id, doc_type, last_nsu, updated_at)
    VALUES(?, 'CTE', ?, ?)
    ON CONFLICT(company_id, doc_type) DO UPDATE SET
      last_nsu=excluded.last_nsu,
      updated_at=excluded.updated_at
  `).run(companyId, lastNsu, now);
}

function upsertDoc({ companyId, nsu, schemaFromZip, xml }) {
  const now = Date.now();
  const parsed = parseCteDocXml(xml);

  db.prepare(`
    INSERT INTO fiscal_documents(
      id, company_id, doc_type, nsu, chave, schema, emit_cnpj, dest_cnpj, dh_emi, valor,
      resumo_xml, xml_completo, created_at, updated_at
    ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(company_id, doc_type, nsu) DO UPDATE SET
      chave=COALESCE(excluded.chave, fiscal_documents.chave),
      schema=COALESCE(excluded.schema, fiscal_documents.schema),
      emit_cnpj=COALESCE(excluded.emit_cnpj, fiscal_documents.emit_cnpj),
      dest_cnpj=COALESCE(excluded.dest_cnpj, fiscal_documents.dest_cnpj),
      dh_emi=COALESCE(excluded.dh_emi, fiscal_documents.dh_emi),
      valor=COALESCE(excluded.valor, fiscal_documents.valor),
      resumo_xml=COALESCE(excluded.resumo_xml, fiscal_documents.resumo_xml),
      xml_completo=COALESCE(excluded.xml_completo, fiscal_documents.xml_completo),
      updated_at=excluded.updated_at
  `).run(
    randomUUID(),
    companyId,
    nsu,
    parsed.chave,
    schemaFromZip || parsed.schema,
    parsed.emit_cnpj,
    parsed.dest_cnpj,
    parsed.dh_emi,
    parsed.valor,
    parsed.resumo_xml,
    parsed.xml_completo,
    now,
    now
  );
}

function extractCteResultXmlFromSoap(soapRespXml) {
  const j = parser.parse(soapRespXml);
  const body = j?.Envelope?.Body;
  if (!body) return null;

  const resp =
    body?.cteDistDFeInteresseResponse ||
    body?.CTeDistribuicaoDFeResponse ||
    Object.values(body || {}).find((v) => v && typeof v === "object") ||
    null;

  if (!resp) return null;

  const result =
    resp?.cteDistDFeInteresseResult ??
    resp?.cteResultMsg ??
    resp?.return ??
    resp?.result ??
    null;

  if (typeof result === "string") return result;
  if (result?.cteResultMsg && typeof result.cteResultMsg === "string") return result.cteResultMsg;

  const candidates = [];
  const walk = (obj) => {
    if (!obj) return;
    if (typeof obj === "string") {
      if (obj.includes("<retDistDFeInt") || obj.includes("retDistDFeInt")) candidates.push(obj);
      return;
    }
    if (typeof obj === "object") for (const v of Object.values(obj)) walk(v);
  };
  walk(resp);
  return candidates[0] || null;
}

async function syncCompany(company, cteUrl) {
  const companyId = company.id;
  const cnpjDigits = onlyDigits(company.cnpj_digits);
  let lastNsu = getCursor(companyId);

  const soapResp = await callCteDist({ url: cteUrl, cnpjDigits, lastNsu });

  const retXml = extractCteResultXmlFromSoap(soapResp);
  if (!retXml) throw new Error("Não encontrei cteResultMsg/retDistDFeInt na resposta SOAP");

  const r = parser.parse(retXml);
  const res = r?.retDistDFeInt;
  if (!res) throw new Error("Resposta não contém retDistDFeInt");

  const cStat = String(res.cStat || "");
  const xMotivo = String(res.xMotivo || "");
  const ultNSU = Number(res.ultNSU || 0);

  console.log(`[CTE] ${cnpjDigits} cStat=${cStat} motivo=${xMotivo} ultNSU=${ultNSU}`);

  const docZips = asArray(res?.loteDistDFeInt?.docZip);
  for (const dz of docZips) {
    const nsu = Number(dz?.["@_NSU"] || dz?.["@_nsu"] || 0);
    const schemaFromZip = String(dz?.["@_schema"] || "");
    const content = dz?.["#text"] ?? dz;

    if (!content || typeof content !== "string") continue;

    const xml = doczip.decodeDocZip(content);
    upsertDoc({ companyId, nsu, schemaFromZip, xml });

    if (nsu > lastNsu) lastNsu = nsu;
  }

  setCursor(companyId, ultNSU || lastNsu);
}

async function main() {
  if (String(FISCAL_MODE || "offline").toLowerCase() !== "online") {
    console.log("[CTE] FISCAL_MODE=offline. Sync SEFAZ desativado.");
    process.exit(0);
  }
  if (!hasA1()) {
    console.log("[CTE] Certificado A1 ausente. Configure A1_PFX_PATH/A1_PFX_PASSWORD. Sync SEFAZ desativado.");
    process.exit(0);
  }

  const endpoints = loadEndpoints();
  const cteUrl = endpoints?.cte?.distribution_dfe?.soap?.url;
  if (!cteUrl) throw new Error("URL CT-e não encontrada no webservice_endpoints.json");

  const companies = getCompanies();
  if (!companies.length) {
    console.log("Nenhuma empresa em fiscal_companies. Cadastre 1 para testar.");
    process.exit(0);
  }

  for (const c of companies) {
    try {
      await syncCompany(c, cteUrl);
    } catch (e) {
      console.error(`[CTE] erro company_id=${c.id}:`, e?.message || e);
    }
  }

  process.exit(0);
}

main();