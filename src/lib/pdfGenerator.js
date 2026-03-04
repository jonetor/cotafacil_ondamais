// src/lib/pdfGenerator.js
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { cnpjMask, cpfMask } from "@/lib/masks";

/* ============================================================
   HELPERS
============================================================ */

const safeText = (t) => (t === 0 ? "0" : t ? String(t) : "");
const onlyDigits = (s) => String(s || "").replace(/\D/g, "");

const formatCurrency = (value) =>
  (Number(value) || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

function asNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function formatDoc(docDigitsOrFormatted, isPF) {
  const d = safeText(docDigitsOrFormatted);
  const digits = onlyDigits(d);
  if (!digits) return "";
  if (d.includes(".") || d.includes("/") || d.includes("-")) return d;
  return isPF ? cpfMask(digits) : cnpjMask(digits);
}

/* ============================================================
   BRAND ASSETS
============================================================ */

const BRAND_ASSETS = {
  logo: "/brand/logo-fibra.png",
  waveHeader: "/brand/onda-04.png",
  waveFooter: "/brand/onda-01.png",
};

async function fetchAsDataURL(url) {
  const resp = await fetch(url, { cache: "no-cache" }).catch(() => null);
  if (!resp || !resp.ok) return null;

  const blob = await resp.blob();
  return await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(blob);
  }).catch(() => null);
}

async function loadBrandImages() {
  const [logo, waveHeader, waveFooter] = await Promise.all([
    fetchAsDataURL(BRAND_ASSETS.logo),
    fetchAsDataURL(BRAND_ASSETS.waveHeader),
    fetchAsDataURL(BRAND_ASSETS.waveFooter),
  ]);
  return { logo, waveHeader, waveFooter };
}

/* ============================================================
   COMPANY HEADER LINE (dados para usar NO CORPO do orçamento)
============================================================ */

const COMPANY_FALLBACK = {
  razao_social: "Fibra Onda Mais LTDA",
  cnpj: "14.429.925/0001-67",
  ie: "15350790-0",
  endereco: "AV DAS NAÇÕES 2235 - CENTRO",
  cep: "CEP 68390-000",
  site: "www.ondamais.ai",
  email: "contato@ondamais.ai",
  fone: "0800 042 0900",
};

function buildCompanyDadosLine(company) {
  const c = company || {};

  const cnpjDigits = onlyDigits(c?.cnpj || COMPANY_FALLBACK.cnpj);
  const cnpj = cnpjDigits ? cnpjMask(cnpjDigits) : COMPANY_FALLBACK.cnpj;

  const ie = safeText(c?.ie || COMPANY_FALLBACK.ie).trim();
  const endereco = safeText(c?.endereco || COMPANY_FALLBACK.endereco).trim();
  const cep = safeText(c?.cep || COMPANY_FALLBACK.cep).trim();
  const site = safeText(c?.site || COMPANY_FALLBACK.site).trim();
  const email = safeText(c?.email || COMPANY_FALLBACK.email).trim();
  const fone = safeText(c?.fone || COMPANY_FALLBACK.fone).trim();

  // linha igual ao seu exemplo (com separadores)
  return `CNPJ: ${cnpj} — I.E. ${ie} — ${endereco} — ${cep} — ${site} — EMAIL: ${email} — FONE: ${fone}`;
}

/* ============================================================
   BRAND DRAW (ondas + logo + slogan apenas)
============================================================ */

function drawBrand(doc, brand) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  // onda superior
  if (brand?.waveHeader) doc.addImage(brand.waveHeader, "PNG", 0, 0, pageW, 18);

  const topY = 16;

  // logo
  if (brand?.logo) {
    const logoW = 80;
    const logoH = 20;
    doc.addImage(brand.logo, "PNG", pageW - logoW - 14, topY, logoW, logoH);
  }

  // slogan
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(60);
  doc.text("A ONDA TRANSFORMADORA", 14, topY + 5);

  // linha separadora
  doc.setDrawColor(200);
  doc.setLineWidth(0.3);
  doc.line(14, topY + 26, pageW - 14, topY + 26);

  // onda inferior
  if (brand?.waveFooter) doc.addImage(brand.waveFooter, "PNG", 0, pageH - 18, pageW, 18);

  doc.setTextColor(0);

  // topo útil
  return topY + 32;
}

/* ============================================================
   NORMALIZAÇÃO
============================================================ */

function normalizeForPdf({ quote, company, client, vendedor, autor }) {
  const q = quote || {};
  const clientDoc =
    client?.cpf_cnpj || client?.document || client?.txIdFormated || client?.txId || "";
  const isPF = onlyDigits(clientDoc).length <= 11 || client?.tipo_pessoa === "PF";

  const items = Array.isArray(q.items) ? q.items : [];
  const normItems = items.map((it) => {
    const quantity = asNumber(it.quantity ?? it.qtde ?? 1);
    const unit_price = asNumber(it.unit_price ?? it.preco ?? it.preco_base ?? 0);
    const total_price =
      it.total_price != null ? asNumber(it.total_price) : quantity * unit_price;

    return {
      ...it,
      item_type: safeText(it.item_type || it.tipo_item || "PRODUTO").trim(),
      code: safeText(it.code ?? it.codigo ?? "").trim(),
      description: safeText(it.description ?? it.descricao ?? "").trim(),
      unit: safeText(it.unit ?? it.unidade ?? "un").trim(),
      quantity,
      unit_price,
      total_price,
      isMeasured:
        Boolean(it.isMeasured) ||
        /a medir/i.test(String(it.description || it.descricao || "")),
    };
  });

  return {
    quote: {
      ...q,
      proposalNumber: safeText(q.proposal_number || "").trim(),
      revision: asNumber(q.revision || 0),
      createdAtStr: format(new Date(q.created_at || new Date()), "dd/MM/yyyy"),
      items: normItems,

      validity_date: safeText(q.validity_date || "").trim(),
      payment_terms: safeText(q.payment_terms || "").trim(),
      freight_type: safeText(q.freight_type || "").trim(),
      delivery_location: safeText(q.delivery_location || "").trim(),
      notes: safeText(q.notes || "").trim(),
      contactPerson: safeText(q.contactPerson || "").trim(),
    },
    company: company || null,
    client: client
      ? {
          ...client,
          __doc: clientDoc,
          __isPF: isPF,
        }
      : null,
    vendedor: vendedor || null,
    autor: autor || null,
  };
}

/* ============================================================
   INFORMAÇÕES ADICIONAIS
============================================================ */

function drawAdditionalInfoBlock(doc, startY, quote) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;

  const lines = [];

  if (quote.validity_date) lines.push(`Validade: ${quote.validity_date} dia(s)`);
  if (quote.payment_terms) lines.push(`Condições de pagamento: ${quote.payment_terms}`);
  if (quote.freight_type) lines.push(`Tipo de frete: ${quote.freight_type}`);
  if (quote.delivery_location) lines.push(`Local de entrega: ${quote.delivery_location}`);

  const hasNotes = Boolean(quote.notes);

  if (lines.length === 0 && !hasNotes) return startY;

  const needed = hasNotes ? 40 : 22;
  if (startY + needed > pageH - 24) {
    doc.addPage();
    startY = 40;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("INFORMAÇÕES ADICIONAIS", margin, startY);

  let y = startY + 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  if (lines.length) {
    const txt = lines.join("\n");
    const chunk = doc.splitTextToSize(txt, pageW - margin * 2);
    doc.text(chunk, margin, y);
    y += chunk.length * 4 + 2;
  }

  if (hasNotes) {
    doc.setFont("helvetica", "bold");
    doc.text("Observações:", margin, y);
    y += 5;

    doc.setFont("helvetica", "normal");
    const noteLines = doc.splitTextToSize(quote.notes, pageW - margin * 2);
    doc.text(noteLines, margin, y);
    y += noteLines.length * 4 + 2;
  }

  return y;
}

/* ============================================================
   ORÇAMENTO (dados da empresa abaixo do título + tabelas separadas)
============================================================ */

function generateOrcamentoPdf(doc, brand, { quote, company, client, vendedor, autor }) {
  const margin = 14;
  const pageW = doc.internal.pageSize.getWidth();

  const contentTop = drawBrand(doc, brand);

  // Título
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("ORÇAMENTO", pageW / 2, contentTop, { align: "center" });

  // ✅ Linha de dados da empresa (a que você mostrou)
  const dadosEmpresa = buildCompanyDadosLine(company);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(40);
  const dadosLines = doc.splitTextToSize(dadosEmpresa, pageW - margin * 2);
  doc.text(dadosLines, pageW / 2, contentTop + 6, { align: "center" });
  doc.setTextColor(0);

  const sellerName = safeText(vendedor?.name || vendedor?.nome || autor?.name || "").trim();
  const solicitante = safeText(quote?.contactPerson || "").trim();

  // Nº / Revisão / Data (agora descem um pouco por causa da linha extra)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Nº: ${quote.proposalNumber} • Revisão: ${quote.revision}`, margin, contentTop + 16);
  doc.text(`Data: ${quote.createdAtStr}`, margin, contentTop + 21);

  let y = contentTop + 28;
  if (sellerName) {
    doc.text(`Vendedor: ${sellerName}`, margin, y);
    y += 5;
  }
  if (solicitante) {
    doc.text(`Solicitante: ${solicitante}`, margin, y);
    y += 5;
  }

  // Cliente (nome/doc)
  if (client) {
    const clientName = safeText(client?.nome_razao || client?.name || "").trim();
    const clientDoc = formatDoc(client?.__doc, client?.__isPF);

    doc.setFont("helvetica", "bold");
    doc.text("Cliente:", margin, y + 4);
    doc.setFont("helvetica", "normal");
    doc.text(clientName || "-", margin + 16, y + 4);

    if (clientDoc) {
      doc.setFont("helvetica", "bold");
      doc.text("CPF/CNPJ:", margin, y + 9);
      doc.setFont("helvetica", "normal");
      doc.text(clientDoc, margin + 20, y + 9);
    }

    y += 14;
  }

  const items = Array.isArray(quote.items) ? quote.items : [];

  const normType = (t) => String(t || "").toUpperCase().trim();
  const isProduto = (it) => normType(it.item_type) === "PRODUTO";
  const isServico = (it) => ["SERVICO", "SERVIÇO"].includes(normType(it.item_type));
  const isScm = (it) => normType(it.item_type) === "SERVICO_SCM";

  const produtos = items.filter(isProduto);
  const servicos = items.filter(isServico);
  const scm = items.filter(isScm);

  const makeRows = (list) =>
    list.map((it) => [
      it.code || "",
      it.description || "",
      it.unit || "",
      String(it.quantity ?? ""),
      formatCurrency(it.unit_price || 0),
      it.isMeasured ? "" : formatCurrency(it.total_price || 0),
    ]);

  const drawSectionTitle = (title, startY) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(title, margin, startY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
  };

  let cursorY = y + 6;

  const drawTable = (title, list) => {
    if (!list.length) return;

    drawSectionTitle(title, cursorY);
    cursorY += 4;

    autoTable(doc, {
      head: [["Cód.", "Descrição", "Un", "Qtd", "Vlr Unit.", "Total"]],
      body: makeRows(list),
      startY: cursorY,
      margin: { left: margin, right: margin },
      styles: { fontSize: 8 },
      didDrawPage: () => drawBrand(doc, brand),
    });

    cursorY = (doc.lastAutoTable?.finalY || cursorY) + 8;
  };

  drawTable("PRODUTOS", produtos);
  drawTable("SERVIÇOS", servicos);
  drawTable("SERVIÇOS SCM", scm);

  if (!produtos.length && !servicos.length && !scm.length) {
    drawSectionTitle("ITENS", cursorY);
    cursorY += 4;

    autoTable(doc, {
      head: [["Cód.", "Descrição", "Un", "Qtd", "Vlr Unit.", "Total"]],
      body: [["", "Nenhum item adicionado", "", "", "", ""]],
      startY: cursorY,
      margin: { left: margin, right: margin },
      styles: { fontSize: 8 },
      didDrawPage: () => drawBrand(doc, brand),
    });

    cursorY = (doc.lastAutoTable?.finalY || cursorY) + 8;
  }

  const total = items.reduce((acc, it) => acc + (it?.isMeasured ? 0 : asNumber(it.total_price)), 0);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(`TOTAL: ${formatCurrency(total)}`, pageW - margin, cursorY + 2, { align: "right" });

  let blockY = cursorY + 10;
  drawAdditionalInfoBlock(doc, blockY, quote);
}

/* ============================================================
   EXPORT
============================================================ */

export const generateQuotePDF = async (payload, options = {}) => {
  const { quote, client, company, vendedor, autor } = normalizeForPdf(payload);
  const download = options.download !== false;

  const brand = await loadBrandImages();
  const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });

  generateOrcamentoPdf(doc, brand, { quote, company, client, vendedor, autor });

  const filename = options.filename || `Orcamento-${quote.proposalNumber || "00000"}.pdf`;

  if (download) {
    doc.save(filename);
    return { ok: true };
  }

  return doc.output("blob");
};