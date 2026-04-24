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

function fitLines(doc, lines, width, maxLines) {
  const out = [];
  for (const line of lines) {
    const wrapped = doc.splitTextToSize(String(line || ""), width);
    for (const w of wrapped) {
      out.push(w);
      if (out.length >= maxLines) return out;
    }
  }
  return out;
}

/* ============================================================
   EMPRESAS / LOGOS DINÂMICAS
============================================================ */

const COMPANY_VISUALS = {
  "static:14429925000167": {
    logo: "/brand/logo-fibra.png",
    waveHeader: "/brand/onda-04.png",
    waveFooter: "/brand/onda-01.png",
  },
  "static:46322439000131": {
    logo: "/brand/logo-ondamais-tecnologia.png",
    waveHeader: "/brand/onda-04.png",
    waveFooter: "/brand/onda-01.png",
  },
  "static:44618753000130": {
    logo: "/brand/logo-sainvest.png",
    waveHeader: "/brand/onda-04.png",
    waveFooter: "/brand/onda-01.png",
  },
  default: {
    logo: "/brand/logo-fibra.png",
    waveHeader: "/brand/onda-04.png",
    waveFooter: "/brand/onda-01.png",
  },
};

function getCompanyVisual(company) {
  const id = String(company?.id || company?.company_id || "").trim();
  return COMPANY_VISUALS[id] || COMPANY_VISUALS.default;
}

/* ============================================================
   COMPRESSÃO DE IMAGENS
============================================================ */

async function loadImageElement(url) {
  return await new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

async function fetchCompressedImage(url, options = {}) {
  const {
    maxWidth = 1200,
    maxHeight = 400,
    mimeType = "image/jpeg",
    quality = 0.72,
    background = "#FFFFFF",
  } = options;

  const img = await loadImageElement(url);
  if (!img) return null;

  const scale = Math.min(
    1,
    maxWidth / img.naturalWidth || 1,
    maxHeight / img.naturalHeight || 1
  );

  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  if (mimeType === "image/jpeg") {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);
  }

  ctx.drawImage(img, 0, 0, width, height);

  const dataUrl = canvas.toDataURL(mimeType, quality);

  return {
    dataUrl,
    width,
    height,
    format: mimeType === "image/png" ? "PNG" : "JPEG",
  };
}

async function loadBrandImages(company) {
  const visual = getCompanyVisual(company);

  const [logo, waveHeader, waveFooter] = await Promise.all([
    fetchCompressedImage(visual.logo, {
      maxWidth: 900,
      maxHeight: 260,
      mimeType: "image/png",
      quality: 0.9,
      background: "#FFFFFF",
    }),
    fetchCompressedImage(visual.waveHeader, {
      maxWidth: 1400,
      maxHeight: 180,
      mimeType: "image/jpeg",
      quality: 0.55,
      background: "#FFFFFF",
    }),
    fetchCompressedImage(visual.waveFooter, {
      maxWidth: 1400,
      maxHeight: 180,
      mimeType: "image/jpeg",
      quality: 0.55,
      background: "#FFFFFF",
    }),
  ]);

  return { logo, waveHeader, waveFooter };
}

/* ============================================================
   FALLBACK EMPRESA
============================================================ */

const COMPANY_FALLBACK = {
  id: "static:14429925000167",
  razao_social: "Fibra Onda Mais LTDA",
  nome_fantasia: "Fibra Onda Mais",
  cnpj: "14.429.925/0001-67",
  ie: "15350790-0",
  endereco: "AV DAS NAÇÕES 2235 - CENTRO",
  cep: "CEP 68390-000",
  site: "www.ondamais.ai",
  email: "contato@ondamais.ai",
  fone: "0800 042 0900",
};

/* ============================================================
   BRAND DRAW
============================================================ */

function drawBrand(doc, brand, company) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  if (brand?.waveHeader?.dataUrl) {
    doc.addImage(
      brand.waveHeader.dataUrl,
      brand.waveHeader.format,
      0,
      0,
      pageW,
      18,
      undefined,
      "FAST"
    );
  }

  const topY = 16;

  if (brand?.logo?.dataUrl) {
    const logoW = 74;
    const ratio = brand.logo.height / brand.logo.width || 0.25;
    const logoH = Math.min(18, logoW * ratio);

    doc.addImage(
      brand.logo.dataUrl,
      brand.logo.format,
      pageW - logoW - 14,
      topY,
      logoW,
      logoH,
      undefined,
      "FAST"
    );
  } else {
    doc.setTextColor(7, 31, 77);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text(
      safeText(company?.nome_fantasia || company?.name || "PROPOSTA"),
      pageW - 14,
      topY + 10,
      { align: "right" }
    );
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(60);
  doc.text("A ONDA TRANSFORMADORA", 14, topY + 5);

  doc.setDrawColor(200);
  doc.setLineWidth(0.3);
  doc.line(14, topY + 26, pageW - 14, topY + 26);

  if (brand?.waveFooter?.dataUrl) {
    doc.addImage(
      brand.waveFooter.dataUrl,
      brand.waveFooter.format,
      0,
      pageH - 18,
      pageW,
      18,
      undefined,
      "FAST"
    );
  }

  doc.setTextColor(0);

  return topY + 32;
}

/* ============================================================
   INFO BOXES SEM TARJA
============================================================ */

function drawInfoBox(doc, { x, y, w, h, title, lines }) {
  doc.setDrawColor(210, 220, 235);
  doc.setFillColor(248, 250, 253);
  doc.roundedRect(x, y, w, h, 2, 2, "FD");

  doc.setTextColor(30, 41, 59);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(title, x + 3, y + 6);

  doc.setDrawColor(225, 230, 238);
  doc.setLineWidth(0.2);
  doc.line(x + 3, y + 8.5, x + w - 3, y + 8.5);

  doc.setTextColor(30);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);

  let lineY = y + 14;
  const fitted = fitLines(doc, lines, w - 6, 6);

  fitted.forEach((line) => {
    doc.text(line, x + 3, lineY);
    lineY += 4.2;
  });
}

/* ============================================================
   NORMALIZAÇÃO
============================================================ */

function normalizeForPdf({ quote, company, client, vendedor, autor }) {
  const q = quote || {};
  const c = company || COMPANY_FALLBACK;

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

  const description = safeText(q.description || q.descricao || q.desc || "").trim();
  const notes = safeText(q.notes || "").trim();
  const additional_info = safeText(q.additional_info || q.additionalInfo || "").trim();
  const finalDescription = description || notes;

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
      description: finalDescription,
      notes,
      additional_info,
      contactPerson: safeText(q.contactPerson || q.contact_person || "").trim(),
    },
    company: {
      ...COMPANY_FALLBACK,
      ...c,
    },
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
   PDF PRINCIPAL
============================================================ */

function generateOrcamentoPdf(doc, brand, { quote, company, client, vendedor, autor }) {
  const margin = 14;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  const contentTop = drawBrand(doc, brand, company);

  const headerMargin = 56;
  const footerMargin = 24;

  const sellerName = safeText(
    vendedor?.name ||
      vendedor?.nome ||
      vendedor?.full_name ||
      vendedor?.email ||
      autor?.name ||
      autor?.nome ||
      ""
  ).trim();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("PROPOSTA COMERCIAL", pageW / 2, contentTop, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Nº: ${quote.proposalNumber} • Revisão: ${quote.revision}`, margin, contentTop + 8);
  doc.text(`Data: ${quote.createdAtStr}`, pageW - margin, contentTop + 8, { align: "right" });

  if (sellerName) {
    doc.text(`Vendedor: ${sellerName}`, margin, contentTop + 13);
  }

  let y = contentTop + 21;

  const companyLines = [
    safeText(company?.razao_social || company?.name || COMPANY_FALLBACK.razao_social),
    `CNPJ: ${formatDoc(company?.cnpj || COMPANY_FALLBACK.cnpj, false)}`,
    `I.E.: ${safeText(company?.ie || COMPANY_FALLBACK.ie)}`,
    safeText(company?.endereco || COMPANY_FALLBACK.endereco),
    safeText(company?.cep || COMPANY_FALLBACK.cep),
    [safeText(company?.email || COMPANY_FALLBACK.email), safeText(company?.fone || COMPANY_FALLBACK.fone)]
      .filter(Boolean)
      .join(" | "),
  ].filter(Boolean);

  const clientName = safeText(client?.nome_razao || client?.name || quote.client_name || "-");
  const clientDoc = formatDoc(
    client?.__doc || quote.client_document || client?.cpf_cnpj || client?.txIdFormated || client?.txId,
    client?.__isPF
  );

  const clientLines = [
    clientName,
    clientDoc ? `CPF/CNPJ: ${clientDoc}` : "CPF/CNPJ: -",
    client?.endereco ? safeText(client.endereco) : "",
    client?.cep ? safeText(client.cep) : "",
    [safeText(client?.email), safeText(client?.telefone)].filter(Boolean).join(" | "),
    quote.contactPerson ? `A/C: ${quote.contactPerson}` : "",
  ].filter(Boolean);

  drawInfoBox(doc, {
    x: 14,
    y,
    w: 88,
    h: 38,
    title: "Fornecedor",
    lines: companyLines,
  });

  drawInfoBox(doc, {
    x: 108,
    y,
    w: 88,
    h: 38,
    title: "Cliente",
    lines: clientLines,
  });

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
    doc.setFillColor(30, 41, 59);
    doc.roundedRect(margin, startY - 4, pageW - margin * 2, 7, 1.5, 1.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(255);
    doc.text(title, margin + 3, startY + 0.8);
    doc.setTextColor(0);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
  };

  let cursorY = y + 46;

  const drawTable = (title, list, subtotalLabel) => {
    if (!list.length) return;

    drawSectionTitle(title, cursorY);
    cursorY += 6;

    autoTable(doc, {
      head: [["Cód.", "Descrição", "Un", "Qtd", "Vlr Unit.", "Total"]],
      body: makeRows(list),
      startY: cursorY,
      margin: {
        left: margin,
        right: margin,
        top: headerMargin,
        bottom: footerMargin,
      },
      styles: {
        fontSize: 8,
        lineColor: [225, 230, 238],
        lineWidth: 0.15,
        cellPadding: 2.2,
      },
      bodyStyles: {
        textColor: [30, 30, 30],
      },
      alternateRowStyles: {
        fillColor: [248, 250, 253],
      },
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: 255,
        fontStyle: "bold",
      },
      willDrawPage: () => {
        drawBrand(doc, brand, company);
      },
    });

    cursorY = (doc.lastAutoTable?.finalY || cursorY) + 3;

    const subtotal = list.reduce(
      (acc, it) => acc + (it?.isMeasured ? 0 : asNumber(it.total_price)),
      0
    );

    autoTable(doc, {
      startY: cursorY,
      body: [[subtotalLabel, formatCurrency(subtotal)]],
      margin: { left: pageW - 90, right: margin },
      styles: {
        fontSize: 8.5,
        fontStyle: "bold",
        cellPadding: 2.5,
        halign: "right",
        lineColor: [225, 230, 238],
        lineWidth: 0.15,
      },
      bodyStyles: {
        textColor: [30, 30, 30],
        fillColor: [245, 247, 250],
      },
      columnStyles: {
        0: { halign: "left", cellWidth: 46 },
        1: { halign: "right", cellWidth: 30 },
      },
      theme: "grid",
      willDrawPage: () => {
        drawBrand(doc, brand, company);
      },
    });

    cursorY = (doc.lastAutoTable?.finalY || cursorY) + 8;
  };

  drawTable("PRODUTOS", produtos, "SUBTOTAL PRODUTOS");
  drawTable("SERVIÇOS", servicos, "SUBTOTAL SERVIÇOS");
  drawTable("SERVIÇOS SCM", scm, "SUBTOTAL SERVIÇOS SCM");

  if (!produtos.length && !servicos.length && !scm.length) {
    drawSectionTitle("ITENS", cursorY);
    cursorY += 6;

    autoTable(doc, {
      head: [["Cód.", "Descrição", "Un", "Qtd", "Vlr Unit.", "Total"]],
      body: [["", "Nenhum item adicionado", "", "", "", ""]],
      startY: cursorY,
      margin: {
        left: margin,
        right: margin,
        top: headerMargin,
        bottom: footerMargin,
      },
      styles: {
        fontSize: 8,
        lineColor: [225, 230, 238],
        lineWidth: 0.15,
        cellPadding: 2.2,
      },
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: 255,
        fontStyle: "bold",
      },
      willDrawPage: () => {
        drawBrand(doc, brand, company);
      },
    });

    cursorY = (doc.lastAutoTable?.finalY || cursorY) + 8;
  }

  let sectionY = cursorY + 2;
  if (sectionY > pageH - 80) {
    doc.addPage();
    drawBrand(doc, brand, company);
    sectionY = 40;
  }

  const totalProdutos = produtos.reduce(
    (acc, it) => acc + (it?.isMeasured ? 0 : asNumber(it.total_price)),
    0
  );

  const totalServicos = servicos.reduce(
    (acc, it) => acc + (it?.isMeasured ? 0 : asNumber(it.total_price)),
    0
  );

  const totalScm = scm.reduce(
    (acc, it) => acc + (it?.isMeasured ? 0 : asNumber(it.total_price)),
    0
  );

  const totalGeral = totalProdutos + totalServicos + totalScm;

  const leftX = margin;
  const leftW = 118;
  const rightX = pageW - 64 - margin;

  const infoLines = [];
  if (quote.validity_date) infoLines.push(`Validade: ${quote.validity_date} dia(s)`);
  if (quote.payment_terms) infoLines.push(`Condições de pagamento: ${quote.payment_terms}`);
  if (quote.freight_type) infoLines.push(`Tipo de frete: ${quote.freight_type}`);
  if (quote.delivery_location) infoLines.push(`Local de entrega: ${quote.delivery_location}`);

  const desc = safeText(quote.description || "").trim();
  const notes = safeText(quote.notes || "").trim();
  const additionalInfo = safeText(quote.additional_info || "").trim();
  const showNotes = notes && notes !== desc;

  if (desc) infoLines.push(`Descrição: ${desc}`);
  if (showNotes) infoLines.push(`Observações: ${notes}`);
  if (additionalInfo) infoLines.push(`Informações adicionais: ${additionalInfo}`);

  let infoStartY = sectionY;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("INFORMAÇÕES ADICIONAIS", leftX, infoStartY);

  let infoTextY = infoStartY + 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  const wrappedInfo = [];
  infoLines.forEach((line) => {
    const chunk = doc.splitTextToSize(String(line || ""), leftW);
    chunk.forEach((c) => wrappedInfo.push(c));
    wrappedInfo.push("");
  });

  if (wrappedInfo.length) {
    doc.text(wrappedInfo, leftX, infoTextY);
  }

  const infoHeight = wrappedInfo.length ? wrappedInfo.length * 4 + 8 : 12;

  autoTable(doc, {
    startY: sectionY,
    body: [
      ["TOTAL PRODUTOS", formatCurrency(totalProdutos)],
      ["TOTAL SERVIÇOS", formatCurrency(totalServicos)],
      ["TOTAL SERVIÇOS SCM", formatCurrency(totalScm)],
      ["TOTAL GERAL", formatCurrency(totalGeral)],
    ],
    margin: { left: rightX, right: margin },
    styles: {
      fontSize: 9,
      fontStyle: "bold",
      cellPadding: 3,
      halign: "right",
      lineColor: [225, 230, 238],
      lineWidth: 0.15,
    },
    bodyStyles: {
      textColor: [30, 30, 30],
    },
    columnStyles: {
      0: { halign: "left", cellWidth: 36 },
      1: { halign: "right", cellWidth: 28 },
    },
    didParseCell: (data) => {
      if (data.row.index === 3) {
        data.cell.styles.fillColor = [30, 41, 59];
        data.cell.styles.textColor = [255, 255, 255];
        data.cell.styles.fontStyle = "bold";
      }
    },
    theme: "grid",
  });

  return Math.max(infoStartY + infoHeight, doc.lastAutoTable.finalY || sectionY);
}

/* ============================================================
   EXPORT
============================================================ */

export const generateQuotePDF = async (payload, options = {}) => {
  const { quote, client, company, vendedor, autor } = normalizeForPdf(payload);
  const download = options.download !== false;

  const brand = await loadBrandImages(company);
  const doc = new jsPDF({
    orientation: "p",
    unit: "mm",
    format: "a4",
    compress: true,
    putOnlyUsedFonts: true,
  });

  generateOrcamentoPdf(doc, brand, { quote, company, client, vendedor, autor });

  const filename = options.filename || `Orcamento-${quote.proposalNumber || "00000"}.pdf`;

  if (download) {
    doc.save(filename);
    return { ok: true };
  }

  return doc.output("blob");
};