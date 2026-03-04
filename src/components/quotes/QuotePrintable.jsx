import React from "react";

export default function QuotePrintable({ quote }) {
  const items = quote?.items || [];

  return (
    <div style={{ padding: 24, fontFamily: "Arial", color: "#111", background: "#fff" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ margin: 0 }}>COTAÇÃO</h1>
          <div style={{ marginTop: 6, fontSize: 12 }}>
            <div><b>Número:</b> {quote?.number || quote?.id || "-"}</div>
            <div><b>Data:</b> {quote?.date || new Date().toLocaleDateString("pt-BR")}</div>
          </div>
        </div>

        <div style={{ textAlign: "right", fontSize: 12 }}>
          <div style={{ fontWeight: 700 }}>{quote?.company?.name || "ONDA+"}</div>
          <div>{quote?.company?.cnpj || ""}</div>
          <div>{quote?.company?.phone || ""}</div>
          <div>{quote?.company?.email || ""}</div>
        </div>
      </div>

      <hr style={{ margin: "16px 0" }} />

      <div style={{ fontSize: 12 }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Cliente</div>
        <div><b>Nome:</b> {quote?.client?.name || quote?.clientName || "-"}</div>
        <div><b>Documento:</b> {quote?.client?.doc || quote?.clientDoc || "-"}</div>
        <div><b>Telefone:</b> {quote?.client?.phone || "-"}</div>
        <div><b>Email:</b> {quote?.client?.email || "-"}</div>
      </div>

      <hr style={{ margin: "16px 0" }} />

      <div style={{ fontSize: 12 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Itens</div>

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr>
              <th style={th}>Item</th>
              <th style={th}>Qtd</th>
              <th style={th}>Vlr Unit.</th>
              <th style={th}>Desconto</th>
              <th style={th}>Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => (
              <tr key={idx}>
                <td style={td}>{it?.name || it?.descricao || "-"}</td>
                <td style={tdCenter}>{it?.qty ?? it?.quantidade ?? 1}</td>
                <td style={tdRight}>{money(it?.unitPrice ?? it?.valor ?? 0)}</td>
                <td style={tdRight}>{money(it?.discount ?? it?.desconto ?? 0)}</td>
                <td style={tdRight}>{money(itTotal(it))}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end" }}>
          <div style={{ width: 260, fontSize: 12 }}>
            <Line label="Subtotal" value={money(quote?.subtotal ?? sumSubtotal(items))} />
            <Line label="Descontos" value={money(quote?.discountTotal ?? sumDiscount(items))} />
            <Line label="Total" value={money(quote?.total ?? sumTotal(items))} bold />
          </div>
        </div>
      </div>

      <hr style={{ margin: "16px 0" }} />

      <div style={{ fontSize: 11, color: "#444" }}>
        <div><b>Vendedor:</b> {quote?.seller?.name || quote?.sellerName || "-"}</div>
        <div><b>Observações:</b> {quote?.notes || "-"}</div>
      </div>

      <div style={{ marginTop: 30, display: "flex", gap: 30 }}>
        <div style={{ flex: 1, textAlign: "center" }}>
          <div style={{ borderTop: "1px solid #999", paddingTop: 6, fontSize: 11 }}>Assinatura do Cliente</div>
        </div>
        <div style={{ flex: 1, textAlign: "center" }}>
          <div style={{ borderTop: "1px solid #999", paddingTop: 6, fontSize: 11 }}>Assinatura do Vendedor</div>
        </div>
      </div>
    </div>
  );
}

function money(v) {
  const n = Number(v || 0);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function itTotal(it) {
  const qty = Number(it?.qty ?? it?.quantidade ?? 1);
  const unit = Number(it?.unitPrice ?? it?.valor ?? 0);
  const disc = Number(it?.discount ?? it?.desconto ?? 0);
  return (qty * unit) - disc;
}

function sumSubtotal(items) {
  return items.reduce((acc, it) => acc + (Number(it?.qty ?? it?.quantidade ?? 1) * Number(it?.unitPrice ?? it?.valor ?? 0)), 0);
}
function sumDiscount(items) {
  return items.reduce((acc, it) => acc + Number(it?.discount ?? it?.desconto ?? 0), 0);
}
function sumTotal(items) {
  return items.reduce((acc, it) => acc + itTotal(it), 0);
}

function Line({ label, value, bold }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontWeight: bold ? 700 : 400 }}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

const th = { borderBottom: "1px solid #ccc", padding: "8px 6px", textAlign: "left" };
const td = { borderBottom: "1px solid #eee", padding: "8px 6px" };
const tdRight = { ...td, textAlign: "right" };
const tdCenter = { ...td, textAlign: "center" };