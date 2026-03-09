import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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

function buildSummaryRows({
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

  return [
    ["Período", periodLabel],
    ["Vendedor", sellerLabel],
    ["Total de propostas", quotes.length],
    ["Propostas aprovadas", approvedQuotes.length],
    ["Propostas pendentes", pendingCount],
    ["Valor total", totalValue],
    ["Valor aprovado", approvedValue],
    ["Total produtos", totalProdutos],
    ["Total serviços", totalServicos],
    ["Total comodato", totalComodato],
    ["Taxa de conversão", conversion],
    ["Ticket médio aprovado", avgApproved],
  ];
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

  const summaryRows = buildSummaryRows({
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

export function exportDashboardToPdf({
  quotes,
  periodLabel,
  sellerLabel,
}) {
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

  const conversion =
    quotes.length > 0 ? `${((approvedQuotes.length / quotes.length) * 100).toFixed(1)}%` : "0%";

  const avgApproved =
    approvedQuotes.length > 0 ? approvedValue / approvedQuotes.length : 0;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Relatório Resumido do Dashboard", 14, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Período: ${periodLabel}`, 14, 28);
  doc.text(`Vendedor: ${sellerLabel}`, 14, 34);
  doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, 14, 40);

  autoTable(doc, {
    startY: 48,
    head: [["Indicador", "Valor"]],
    body: [
      ["Total de propostas", String(quotes.length)],
      ["Propostas aprovadas", String(approvedQuotes.length)],
      ["Propostas pendentes", String(pendingCount)],
      ["Valor total", money(totalValue)],
      ["Valor aprovado", money(approvedValue)],
      ["Total produtos", money(totalProdutos)],
      ["Total serviços", money(totalServicos)],
      ["Total comodato", money(totalComodato)],
      ["Taxa de conversão", conversion],
      ["Ticket médio aprovado", money(avgApproved)],
    ],
    styles: { fontSize: 10 },
    headStyles: { fillColor: [30, 41, 59] },
    margin: { left: 14, right: 14 },
  });

  const fileName = `Relatorio_Resumo_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
}