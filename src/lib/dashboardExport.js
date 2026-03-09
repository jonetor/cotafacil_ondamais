import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/* =========================================================
   HELPERS
========================================================= */

function money(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function safeDate(dateLike) {
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("pt-BR");
}

function safeSheetName(name, fallback = "Planilha") {
  const cleaned = String(name || fallback)
    .replace(/[\\/*?:[\]]/g, "")
    .trim();
  return (cleaned || fallback).slice(0, 31);
}

/* =========================================================
   BRAND ASSETS (mesma ideia do orçamento)
========================================================= */

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

function drawBrand(doc, brand) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  if (brand?.waveHeader) doc.addImage(brand.waveHeader, "PNG", 0, 0, pageW, 18);

  const topY = 16;

  if (brand?.logo) {
    const logoW = 80;
    const logoH = 20;
    doc.addImage(brand.logo, "PNG", pageW - logoW - 14, topY, logoW, logoH);
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(60);
  doc.text("A ONDA TRANSFORMADORA", 14, topY + 5);

  doc.setDrawColor(200);
  doc.setLineWidth(0.3);
  doc.line(14, topY + 26, pageW - 14, topY + 26);

  if (brand?.waveFooter) doc.addImage(brand.waveFooter, "PNG", 0, pageH - 18, pageW, 18);

  doc.setTextColor(0);

  return topY + 32;
}

/* =========================================================
   SUMMARY
========================================================= */

function buildSummaryData({
  periodLabel,
  sellerLabel,
  quotes,
  approvedQuotes,
  pendingCount,
  totalValue,
  approvedValue,
  totalProdutos,
  totalServicos,
  totalComodato,
}) {
  const conversion =
    quotes.length > 0 ? `${((approvedQuotes.length / quotes.length) * 100).toFixed(1)}%` : "0%";

  const avgApproved =
    approvedQuotes.length > 0 ? approvedValue / approvedQuotes.length : 0;

  return {
    periodLabel,
    sellerLabel,
    totalQuotes: quotes.length,
    approvedCount: approvedQuotes.length,
    pendingCount,
    totalValue,
    approvedValue,
    totalProdutos,
    totalServicos,
    totalComodato,
    conversion,
    avgApproved,
  };
}

function mapQuotesToRows(quotes, getClientName, getSellerName) {
  return quotes.map((q) => ({
    Proposta: q.proposal_number || "-",
    Data: safeDate(q.created_at),
    Cliente: getClientName(q.client_id, q.client_name),
    Vendedor: getSellerName(q.seller_id),
    Status: q.status || "pending",
    "Valor Total": Number(q.total_value || 0),
    Produtos: Number(q.total_produtos || 0),
    Serviços: Number(q.total_servicos || 0),
    Comodato: Number(q.total_comodato || 0),
    "Contato Cliente": q.contact_person || "",
    "Condições Pagamento": q.payment_terms || "",
    Frete: q.freight_type || "",
    Entrega: q.delivery_location || "",
    Observações: q.notes || "",
    "Informações Adicionais": q.additional_info || "",
  }));
}

/* =========================================================
   EXCEL
========================================================= */

export function exportDashboardToExcel({
  quotes,
  sellers,
  selectedSellerId,
  periodLabel,
  sellerLabel,
  getClientName,
  getSellerName,
}) {
  const wb = XLSX.utils.book_new();

  const approvedQuotes = quotes.filter(
    (q) => String(q.status || "").toLowerCase() === "approved"
  );
  const pendingCount = quotes.filter(
    (q) => String(q.status || "").toLowerCase() === "pending"
  ).length;

  const totalValue = quotes.reduce((sum, q) => sum + Number(q.total_value || 0), 0);
  const approvedValue = approvedQuotes.reduce(
    (sum, q) => sum + Number(q.total_value || 0),
    0
  );
  const totalProdutos = quotes.reduce(
    (sum, q) => sum + Number(q.total_produtos || 0),
    0
  );
  const totalServicos = quotes.reduce(
    (sum, q) => sum + Number(q.total_servicos || 0),
    0
  );
  const totalComodato = quotes.reduce(
    (sum, q) => sum + Number(q.total_comodato || 0),
    0
  );

  const summary = buildSummaryData({
    periodLabel,
    sellerLabel,
    quotes,
    approvedQuotes,
    pendingCount,
    totalValue,
    approvedValue,
    totalProdutos,
    totalServicos,
    totalComodato,
  });

  const summaryRows = [
    ["Período", summary.periodLabel],
    ["Vendedor", summary.sellerLabel],
    ["Total de propostas", summary.totalQuotes],
    ["Propostas aprovadas", summary.approvedCount],
    ["Propostas pendentes", summary.pendingCount],
    ["Valor total", summary.totalValue],
    ["Valor aprovado", summary.approvedValue],
    ["Total produtos", summary.totalProdutos],
    ["Total serviços", summary.totalServicos],
    ["Total comodato", summary.totalComodato],
    ["Taxa de conversão", summary.conversion],
    ["Ticket médio aprovado", summary.avgApproved],
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
  summarySheet["!cols"] = [{ wch: 24 }, { wch: 22 }];
  XLSX.utils.book_append_sheet(wb, summarySheet, "Resumo");

  if (selectedSellerId) {
    const sellerQuotes = quotes.filter(
      (q) => String(q.seller_id || "") === String(selectedSellerId)
    );

    const sellerRows = mapQuotesToRows(sellerQuotes, getClientName, getSellerName);
    const ws = XLSX.utils.json_to_sheet(sellerRows);
    ws["!cols"] = [
      { wch: 12 },
      { wch: 12 },
      { wch: 35 },
      { wch: 24 },
      { wch: 14 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 24 },
      { wch: 24 },
      { wch: 16 },
      { wch: 24 },
      { wch: 40 },
      { wch: 40 },
    ];
    XLSX.utils.book_append_sheet(
      wb,
      ws,
      safeSheetName(getSellerName(selectedSellerId), "Vendedor")
    );
  } else {
    const sellerMap = new Map();

    for (const q of quotes) {
      const sid = String(q.seller_id || "sem-vendedor");
      if (!sellerMap.has(sid)) sellerMap.set(sid, []);
      sellerMap.get(sid).push(q);
    }

    for (const [sid, sellerQuotes] of sellerMap.entries()) {
      const sellerRows = mapQuotesToRows(sellerQuotes, getClientName, getSellerName);
      const ws = XLSX.utils.json_to_sheet(sellerRows);
      ws["!cols"] = [
        { wch: 12 },
        { wch: 12 },
        { wch: 35 },
        { wch: 24 },
        { wch: 14 },
        { wch: 16 },
        { wch: 16 },
        { wch: 16 },
        { wch: 16 },
        { wch: 24 },
        { wch: 24 },
        { wch: 16 },
        { wch: 24 },
        { wch: 40 },
        { wch: 40 },
      ];

      XLSX.utils.book_append_sheet(
        wb,
        ws,
        safeSheetName(getSellerName(sid), "Sem vendedor")
      );
    }
  }

  const now = new Date();
  const fileName = `Relatorio_Dashboard_${now.toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/* =========================================================
   PDF RESUMIDO COM LAYOUT DE ORÇAMENTO
========================================================= */

export async function exportDashboardToPdf({
  quotes,
  periodLabel,
  sellerLabel,
}) {
  const brand = await loadBrandImages();
  const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });

  const approvedQuotes = quotes.filter(
    (q) => String(q.status || "").toLowerCase() === "approved"
  );
  const pendingCount = quotes.filter(
    (q) => String(q.status || "").toLowerCase() === "pending"
  ).length;

  const totalValue = quotes.reduce((sum, q) => sum + Number(q.total_value || 0), 0);
  const approvedValue = approvedQuotes.reduce(
    (sum, q) => sum + Number(q.total_value || 0),
    0
  );
  const totalProdutos = quotes.reduce(
    (sum, q) => sum + Number(q.total_produtos || 0),
    0
  );
  const totalServicos = quotes.reduce(
    (sum, q) => sum + Number(q.total_servicos || 0),
    0
  );
  const totalComodato = quotes.reduce(
    (sum, q) => sum + Number(q.total_comodato || 0),
    0
  );

  const summary = buildSummaryData({
    periodLabel,
    sellerLabel,
    quotes,
    approvedQuotes,
    pendingCount,
    totalValue,
    approvedValue,
    totalProdutos,
    totalServicos,
    totalComodato,
  });

  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;
  const contentTop = drawBrand(doc, brand);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("RELATÓRIO RESUMIDO DE VENDAS", pageW / 2, contentTop, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(40);
  const headerInfo = `Período: ${summary.periodLabel}   |   Vendedor: ${summary.sellerLabel}   |   Gerado em: ${new Date().toLocaleString("pt-BR")}`;
  const headerLines = doc.splitTextToSize(headerInfo, pageW - margin * 2);
  doc.text(headerLines, pageW / 2, contentTop + 6, { align: "center" });
  doc.setTextColor(0);

  let cursorY = contentTop + 18;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("RESUMO EXECUTIVO", margin, cursorY);

  cursorY += 4;

  autoTable(doc, {
    startY: cursorY,
    theme: "grid",
    head: [["Indicador", "Valor"]],
    body: [
      ["Total de propostas", String(summary.totalQuotes)],
      ["Propostas aprovadas", String(summary.approvedCount)],
      ["Propostas pendentes", String(summary.pendingCount)],
      ["Valor total", money(summary.totalValue)],
      ["Valor aprovado", money(summary.approvedValue)],
      ["Total produtos", money(summary.totalProdutos)],
      ["Total serviços", money(summary.totalServicos)],
      ["Total comodato", money(summary.totalComodato)],
      ["Taxa de conversão", summary.conversion],
      ["Ticket médio aprovado", money(summary.avgApproved)],
    ],
    margin: { left: margin, right: margin },
    styles: {
      fontSize: 9,
      cellPadding: 3,
      overflow: "linebreak",
      valign: "middle",
    },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: 255,
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [245, 247, 250],
    },
    didDrawPage: () => drawBrand(doc, brand),
  });

  cursorY = (doc.lastAutoTable?.finalY || cursorY) + 10;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("OBSERVAÇÕES", margin, cursorY);

  cursorY += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  const obsText =
    "Este relatório resume as vendas do dashboard conforme os filtros aplicados. Os valores apresentados consideram apenas as cotações encontradas no período e no vendedor selecionado.";

  const obsLines = doc.splitTextToSize(obsText, pageW - margin * 2);
  doc.text(obsLines, margin, cursorY);

  const fileName = `Relatorio_Resumo_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
}