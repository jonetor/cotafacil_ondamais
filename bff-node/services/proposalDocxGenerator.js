import {
  AlignmentType,
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";

function safe(v) {
  return v === 0 ? "0" : v ? String(v) : "";
}

function n(v) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

function money(v) {
  return n(v).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function cell(text, width, opts = {}) {
  return new TableCell({
    width: {
      size: width,
      type: WidthType.PERCENTAGE,
    },
    children: [
      new Paragraph({
        alignment: opts.align || AlignmentType.LEFT,
        children: [
          new TextRun({
            text: safe(text),
            bold: !!opts.bold,
            size: 20,
          }),
        ],
      }),
    ],
  });
}

function sectionTitle(text) {
  return new Paragraph({
    spacing: { before: 240, after: 120 },
    children: [
      new TextRun({
        text: String(text || "").toUpperCase(),
        bold: true,
        size: 24,
      }),
    ],
  });
}

function paragraph(text) {
  return new Paragraph({
    spacing: { after: 100 },
    children: [
      new TextRun({
        text: safe(text),
        size: 22,
      }),
    ],
  });
}

function keyValue(label, value) {
  return new Paragraph({
    spacing: { after: 80 },
    children: [
      new TextRun({
        text: `${label}: `,
        bold: true,
        size: 22,
      }),
      new TextRun({
        text: safe(value),
        size: 22,
      }),
    ],
  });
}

function buildItemsTable(items = []) {
  const rows = [
    new TableRow({
      children: [
        cell("Código", 12, { bold: true }),
        cell("Descrição", 34, { bold: true }),
        cell("Un.", 8, { bold: true, align: AlignmentType.CENTER }),
        cell("Qtd.", 8, { bold: true, align: AlignmentType.CENTER }),
        cell("Valor Unit.", 14, { bold: true, align: AlignmentType.RIGHT }),
        cell("Desc.", 12, { bold: true, align: AlignmentType.RIGHT }),
        cell("Total", 12, { bold: true, align: AlignmentType.RIGHT }),
      ],
    }),
  ];

  if (!items.length) {
    rows.push(
      new TableRow({
        children: [
          new TableCell({
            columnSpan: 7,
            children: [paragraph("Nenhum item informado.")],
          }),
        ],
      })
    );
  } else {
    for (const item of items) {
      rows.push(
        new TableRow({
          children: [
            cell(item.code || "", 12),
            cell(item.description || "", 34),
            cell(item.unit || "", 8, { align: AlignmentType.CENTER }),
            cell(String(item.quantity ?? ""), 8, { align: AlignmentType.CENTER }),
            cell(money(item.unit_price || 0), 14, { align: AlignmentType.RIGHT }),
            cell(money(item.discount_total || 0), 12, { align: AlignmentType.RIGHT }),
            cell(money(item.total_price || 0), 12, { align: AlignmentType.RIGHT }),
          ],
        })
      );
    }
  }

  return new Table({
    width: {
      size: 100,
      type: WidthType.PERCENTAGE,
    },
    rows,
  });
}

export async function generateProposalDocx(previewData = {}) {
  const quote = previewData?.quote || {};
  const company = previewData?.company || {};
  const client = previewData?.client || {};
  const vendedor = previewData?.vendedor || {};
  const items = Array.isArray(quote.items) ? quote.items : [];

  const totalProdutos = items
    .filter((i) => String(i.item_type || "").toUpperCase() === "PRODUTO")
    .reduce((a, i) => a + n(i.total_price), 0);

  const totalServicos = items
    .filter((i) =>
      ["SERVICO", "SERVIÇO"].includes(String(i.item_type || "").toUpperCase())
    )
    .reduce((a, i) => a + n(i.total_price), 0);

  const totalScm = items
    .filter((i) => String(i.item_type || "").toUpperCase() === "SERVICO_SCM")
    .reduce((a, i) => a + n(i.total_price), 0);

  const subtotalBruto =
    n(quote.subtotal_bruto) ||
    items.reduce(
      (a, i) => a + n(i.total_price_original || n(i.quantity) * n(i.unit_price)),
      0
    );

  const descontoTotal =
    n(quote.discount_total) ||
    items.reduce((a, i) => a + n(i.discount_total), 0);

  const totalGeral =
    n(quote.total_geral_com_desconto) ||
    totalProdutos + totalServicos + totalScm;

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 240 },
            children: [
              new TextRun({
                text: "PROPOSTA COMERCIAL",
                bold: true,
                size: 30,
              }),
            ],
          }),

          keyValue("Proposta", quote.proposal_number || ""),
          keyValue("Revisão", quote.revision ?? 0),
          keyValue("Empresa", company.razao_social || company.name || ""),
          keyValue("Cliente", client.nome_razao || client.name || quote.client_name || ""),
          keyValue(
            "Vendedor",
            vendedor.name || vendedor.nome || vendedor.email || ""
          ),

          sectionTitle("Objeto"),
          paragraph(quote.objeto),

          sectionTitle("Missão"),
          paragraph(quote.missao),

          sectionTitle("Escopo Técnico"),
          paragraph(quote.escopo_tecnico),

          sectionTitle("Itens"),
          buildItemsTable(items),

          sectionTitle("Segmentação"),
          paragraph(quote.segmentacao),

          sectionTitle("Investimento"),
          paragraph(quote.investimento_texto),

          sectionTitle("Condições Comerciais"),
          paragraph(quote.condicoes_comerciais),

          sectionTitle("Totais"),
          keyValue("Total Produtos", money(totalProdutos)),
          keyValue("Total Serviços", money(totalServicos)),
          keyValue("Total Serviços SCM", money(totalScm)),
          keyValue("Subtotal Bruto", money(subtotalBruto)),
          keyValue("Desconto Total", money(descontoTotal)),
          keyValue("Total Geral", money(totalGeral)),

          sectionTitle("Forma de Pagamento"),
          paragraph(quote.forma_pagamento || quote.payment_terms),

          sectionTitle("Validade da Proposta"),
          paragraph(quote.validade_proposta || quote.validity_date),

          sectionTitle("Observações"),
          paragraph(quote.observacoes || quote.additional_info || quote.description),

          sectionTitle("Assinatura Técnica"),
          paragraph(
            quote.assinatura_tecnica ||
              vendedor.name ||
              vendedor.nome ||
              ""
          ),
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}