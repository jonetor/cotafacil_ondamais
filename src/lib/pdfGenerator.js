import jsPDF from "jspdf";
import "jspdf-autotable";
import { format } from "date-fns";
import { cnpjMask, cpfMask } from "@/lib/masks";

const safeText = (t) => (t === 0 ? "0" : t ? String(t) : "");
const onlyDigits = (s) => String(s || "").replace(/\D/g, "");

const formatCurrency = (value) =>
  (Number(value) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function pick(obj, keys, fallback = "") {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") return v;
  }
  return fallback;
}

function normalizeQuote(q) {
  const proposalNumber = pick(q, ["proposal_number", "proposta_numero", "proposalNumber"], "");
  const revision = pick(q, ["revision", "revisao"], 0);

  const paymentTerms = pick(q, ["payment_terms", "paymentTerms"], "");
  const freightType = pick(q, ["freight_type", "freightType"], "");
  const deliveryLocation = pick(q, ["delivery_location", "deliveryLocation"], "");
  const notes = pick(q, ["notes"], "");
  const contactPerson = pick(q, ["contactPerson", "contact_person"], "");

  const items = Array.isArray(q?.items) ? q.items : [];
  const totalGeral = Number(pick(q, ["total_geral", "total_value", "totalGeral"], 0)) || 0;

  return { proposalNumber, revision, paymentTerms, freightType, deliveryLocation, notes, contactPerson, items, totalGeral };
}

function normalizeCompany(c) {
  return {
    name: pick(c, ["name", "nome"], ""),
    cnpj: pick(c, ["cnpj"], ""),
    ie: pick(c, ["ie"], ""),
    email: pick(c, ["email"], ""),
    phone: pick(c, ["phone", "telefone"], ""),
    address: c?.addresses?.[0] || {},
  };
}

function normalizeClient(c) {
  const doc = pick(c, ["cpf_cnpj", "document", "txIdFormated", "txId"], "");
  const isPF = onlyDigits(doc).length <= 11 || pick(c, ["tipo_pessoa"], "") === "PF";

  return {
    name: pick(c, ["nome_razao", "name", "nome"], ""),
    doc,
    isPF,
    email: pick(c, ["email"], ""),
    phone: pick(c, ["telefone", "phone"], ""),
    address: c?.addresses?.[0] || {},
  };
}

function normalizeSeller(s) {
  return {
    name: pick(s, ["name", "nome"], ""),
    email: pick(s, ["email"], ""),
    phone: pick(s, ["telefone", "phone"], ""),
  };
}

function normalizeItems(items) {
  return (items || []).map((it) => ({
    tipo: pick(it, ["item_type", "tipo_item"], ""),
    code: pick(it, ["code", "codigo"], ""),
    description: pick(it, ["description", "descricao"], ""),
    unit: pick(it, ["unit", "unidade"], ""),
    qty: Number(pick(it, ["quantity", "qtde"], 0)) || 0,
    unitPrice: Number(pick(it, ["unit_price", "preco_base"], 0)) || 0,
    totalPrice: Number(pick(it, ["total_price", "valor_total_item"], 0)) || 0,
  }));
}

export const generateQuotePDF = ({ quote, company, client, vendedor, autor, template = "orcamento" }) => {
  const q = normalizeQuote(quote || {});
  const comp = normalizeCompany(company || {});
  const cli = normalizeClient(client || {});
  const sell = normalizeSeller(vendedor || {});
  const items = normalizeItems(q.items);

  const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = margin;

  const title = template === "proposta" ? "PROPOSTA COMERCIAL" : "ORÇAMENTO";

  // Cabeçalho
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(title, pageW / 2, y, { align: "center" });
  y += 6;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Nº: ${safeText(q.proposalNumber || "-")}  |  Revisão: ${safeText(q.revision || 0)}`, pageW / 2, y, {
    align: "center",
  });
  y += 8;

  // Fornecedor / Cliente
  const companyDoc = cnpjMask(comp.cnpj);
  const clientDoc = cli.isPF ? cpfMask(cli.doc) : cnpjMask(cli.doc);

  doc.setFont("helvetica", "bold");
  doc.text("Fornecedor", margin, y);
  doc.text("Cliente", pageW / 2 + 2, y);
  y += 4;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);

  const compAddr = comp.address || {};
  const cliAddr = cli.address || {};

  const compLines = [
    safeText(comp.name),
    `CNPJ: ${safeText(companyDoc)} ${comp.ie ? `| IE: ${safeText(comp.ie)}` : ""}`,
    `${safeText(compAddr.logradouro)}, ${safeText(compAddr.numero)} - ${safeText(compAddr.bairro)}`,
    `${safeText(compAddr.cidade)} / ${safeText(compAddr.uf)}  CEP: ${safeText(compAddr.cep)}`,
    comp.email ? `Email: ${safeText(comp.email)}` : "",
    comp.phone ? `Tel: ${safeText(comp.phone)}` : "",
  ].filter(Boolean);

  const cliLines = [
    safeText(cli.name),
    `CNPJ/CPF: ${safeText(clientDoc)}`,
    `${safeText(cliAddr.logradouro)}, ${safeText(cliAddr.numero)} - ${safeText(cliAddr.bairro)}`,
    `${safeText(cliAddr.cidade)} / ${safeText(cliAddr.uf)}  CEP: ${safeText(cliAddr.cep)}`,
    cli.email ? `Email: ${safeText(cli.email)}` : "",
    cli.phone ? `Tel: ${safeText(cli.phone)}` : "",
    q.contactPerson ? `Aos cuidados: ${safeText(q.contactPerson)}` : "",
  ].filter(Boolean);

  doc.text(compLines, margin, y);
  doc.text(cliLines, pageW / 2 + 2, y);

  y += Math.max(compLines.length, cliLines.length) * 3.5 + 6;

  // Proposta Comercial: bloco extra
  if (template === "proposta") {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Apresentação", margin, y);
    y += 4;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const intro =
      "Agradecemos a oportunidade. Segue nossa proposta comercial conforme solicitado. " +
      "Condições e valores sujeitos à validade e disponibilidade.";
    doc.text(doc.splitTextToSize(intro, pageW - margin * 2), margin, y);
    y += 12;

    const sellerTxt = `Consultor: ${safeText(sell.name)}${sell.email ? ` | ${safeText(sell.email)}` : ""}${
      sell.phone ? ` | ${safeText(sell.phone)}` : ""
    }`;
    doc.text(doc.splitTextToSize(sellerTxt, pageW - margin * 2), margin, y);
    y += 8;
  }

  // Tabela de itens
  const head = [["Código", "Descrição", "Un", "Qtd", "Vlr Unit.", "Total"]];

  const body = items.map((it) => [
    safeText(it.code),
    safeText(it.description),
    safeText(it.unit),
    (Number(it.qty) || 0).toFixed(3),
    formatCurrency(it.unitPrice),
    formatCurrency(it.totalPrice),
  ]);

  doc.autoTable({
    head,
    body,
    startY: y,
    margin: { left: margin, right: margin },
    styles: { fontSize: 7, cellPadding: 1.5, overflow: "linebreak" },
    headStyles: { fillColor: [30, 30, 30], fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 22 },
      2: { cellWidth: 10, halign: "center" },
      3: { cellWidth: 12, halign: "center" },
      4: { cellWidth: 24, halign: "right" },
      5: { cellWidth: 26, halign: "right", fontStyle: "bold" },
    },
  });

  y = doc.autoTable.previous.finalY + 8;

  // Totais e condições
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("TOTAL:", pageW - margin - 35, y, { align: "right" });
  doc.text(formatCurrency(q.totalGeral || items.reduce((a, b) => a + (b.totalPrice || 0), 0)), pageW - margin, y, {
    align: "right",
  });
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);

  const infos = [
    q.paymentTerms ? `Pagamento: ${safeText(q.paymentTerms)}` : "",
    q.freightType ? `Frete: ${safeText(q.freightType)}` : "",
    q.deliveryLocation ? `Entrega: ${safeText(q.deliveryLocation)}` : "",
  ].filter(Boolean);

  if (infos.length) {
    doc.text(infos, margin, y);
    y += infos.length * 3.5 + 4;
  }

  if (q.notes) {
    doc.setFont("helvetica", "bold");
    doc.text(template === "proposta" ? "Condições Gerais" : "Observações", margin, y);
    y += 4;
    doc.setFont("helvetica", "normal");
    doc.text(doc.splitTextToSize(safeText(q.notes), pageW - margin * 2), margin, y);
  }

  // Rodapé
  const totalPages = doc.internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`Página ${p} de ${totalPages}`, pageW - margin, 287, { align: "right" });
    doc.text(`Emitido em: ${format(new Date(), "dd/MM/yyyy HH:mm:ss")}`, margin, 287);
  }

  const fileName =
    (template === "proposta" ? "Proposta_Comercial" : "Orcamento") +
    `_${safeText(q.proposalNumber || "s-numero")}.pdf`;

  doc.save(fileName);
};