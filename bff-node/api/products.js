import express from "express";
import crypto from "node:crypto";

import { db, initDb, norm } from "../db.js";
import { requireAuth, requireAdmin } from "./auth.js";
import { getVoalleToken } from "../voalleAuth.js";

// ✅ garante tabela products
initDb();

const router = express.Router();

const VOALLE_URL =
  "https://erp.ispmais.com:45715/external/integrations/thirdparty/crm/campaignsandpricelistservices";

// -------------------------------
// Helpers
// -------------------------------

function nowMs() {
  return Date.now();
}

function toIntBool(v, def = 0) {
  if (v === true) return 1;
  if (v === false) return 0;
  if (v === 1 || v === 0) return v;
  if (v == null) return def;
  const s = String(v).trim().toLowerCase();
  if (["1", "true", "sim", "yes", "y"].includes(s)) return 1;
  if (["0", "false", "nao", "não", "no", "n"].includes(s)) return 0;
  return def;
}

function mapVoalleUseToType(use) {
  const u = String(use || "").toUpperCase();
  if (u === "P") return "PRODUTO";
  // no Voalle esses itens "R" são combos/planos; no CotaFácil tratamos como serviço
  if (u === "R") return "SERVICO";
  return "SERVICO";
}

function filterByUse(rows, useFilter) {
  const f = String(useFilter || "ALL").toUpperCase();
  if (f === "ALL") return rows;

  // Voalle -> coluna use
  // Manual -> inferimos: PRODUTO => P, demais => R
  return rows.filter((r) => {
    const src = String(r.source || "manual");
    if (src === "voalle") return String(r.use || "").toUpperCase() === f;
    if (f === "P") return String(r.type || "").toUpperCase() === "PRODUTO";
    if (f === "R") return String(r.type || "").toUpperCase() !== "PRODUTO";
    return true;
  });
}

function rowToApi(r) {
  // ✅ mantém os campos do front e devolve extras (sem quebrar)
  return {
    id: r.id,
    cod: r.cod,
    description: r.description,
    type: r.type,
    unit: r.unit,
    sale_price: r.sale_price,
    active: r.active === 1,

    // extras
    source: r.source,
    use: r.use,
    originalPrice: r.original_price,
    paymentForm: r.payment_form,
    paymentFormCode: r.payment_form_code,
    isLoyalty: r.is_loyalty === 1,
    loyaltyPrice: r.loyalty_price,
    loyaltyMonths: r.loyalty_months,
    campaignCode: r.campaign_code,
    campaignTitle: r.campaign_title,
    priceListId: r.price_list_id,
    priceListCode: r.price_list_code,
    priceListTitle: r.price_list_title,
  };
}

// -------------------------------
// GET /api/products?use=ALL|P|R
// Lista produtos do banco (manual + Voalle já sincronizado)
// -------------------------------

router.get("/products", requireAuth, (req, res) => {
  try {
    const useFilter = String(req.query.use || "ALL").toUpperCase();
    const q = String(req.query.q || "").trim();
    const limit = Math.min(Number(req.query.limit || 5000), 20000);

    let rows;
    if (!q) {
      rows = db
        .prepare(
          `SELECT * FROM products
           ORDER BY description COLLATE NOCASE ASC
           LIMIT ?`
        )
        .all(limit);
    } else {
      const qn = norm(q);
      rows = db
        .prepare(
          `SELECT * FROM products
           WHERE lower(cod) LIKE ? OR lower(description) LIKE ?
           ORDER BY description COLLATE NOCASE ASC
           LIMIT ?`
        )
        .all(`%${qn}%`, `%${qn}%`, limit);
    }

    rows = filterByUse(rows, useFilter);
    const items = rows.map(rowToApi);

    res.json({ ok: true, total: items.length, items });
  } catch (e) {
    res.status(500).json({ ok: false, message: String(e?.message || e) });
  }
});

// -------------------------------
// POST /api/products
// Cria produto MANUAL no banco (source='manual')
// -------------------------------

// ✅ Qualquer usuário autenticado pode criar itens manuais (admin + vendedor + usuários)
router.post("/products", requireAuth, (req, res) => {
  try {
    const cod = String(req.body?.cod ?? req.body?.code ?? "").trim();
    const description = String(req.body?.description ?? req.body?.name ?? "").trim();
    const type = String(req.body?.type || "PRODUTO").trim() || "PRODUTO";
    const unit = String(req.body?.unit || "").trim();
    const sale_price = Number(req.body?.sale_price ?? req.body?.price ?? 0) || 0;
    const active = toIntBool(req.body?.active, 1);

    if (!description) {
      return res.status(400).json({ ok: false, message: "description é obrigatório" });
    }

    const id = crypto.randomUUID();
    const t = nowMs();

    db.prepare(
      `INSERT INTO products (
        id, cod, description, type, unit, sale_price, active,
        source,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'manual', ?, ?)`
    ).run(id, cod || null, description, type, unit || null, sale_price, active, t, t);

    const row = db.prepare(`SELECT * FROM products WHERE id = ?`).get(id);
    res.json({ ok: true, item: rowToApi(row) });
  } catch (e) {
    res.status(500).json({ ok: false, message: String(e?.message || e) });
  }
});

// -------------------------------
// POST /api/products/manual
// Alias compatível com o front (mesmo INSERT do /products)
// -------------------------------

router.post("/products/manual", requireAuth, (req, res) => {
  try {
    const cod = String(req.body?.cod ?? req.body?.code ?? "").trim();
    const description = String(req.body?.description ?? req.body?.name ?? "").trim();

    // Mapeia "use" para type
    const use = String(req.body?.use || "P").toUpperCase();
    const type = req.body?.type
      ? String(req.body.type).toUpperCase()
      : use === "P"
      ? "PRODUTO"
      : "SERVICO";

    const unit = String(req.body?.unit || "").trim();
    const sale_price = Number(req.body?.sale_price ?? req.body?.price ?? 0) || 0;
    const active = toIntBool(req.body?.active, 1);

    if (!cod && !description) {
      return res.status(400).json({ ok: false, message: "Informe code/cod e name/description" });
    }
    if (!description) {
      return res.status(400).json({ ok: false, message: "name/description é obrigatório" });
    }

    const id = crypto.randomUUID();
    const t = nowMs();

    db.prepare(
      `INSERT INTO products (
        id, cod, description, type, unit, sale_price, active,
        source,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'manual', ?, ?)`
    ).run(id, cod || null, description, type, unit || null, sale_price, active, t, t);

    const row = db.prepare(`SELECT * FROM products WHERE id = ?`).get(id);
    res.json({ ok: true, item: rowToApi(row) });
  } catch (e) {
    res.status(500).json({ ok: false, message: String(e?.message || e) });
  }
});

// -------------------------------
// PUT /api/products/:id
// Atualiza produto MANUAL
// -------------------------------

router.put("/products/:id", requireAuth, (req, res) => {
  try {
    const id = String(req.params.id || "").trim();
    if (!id) return res.status(400).json({ ok: false, message: "id é obrigatório" });

    const existing = db.prepare(`SELECT * FROM products WHERE id = ?`).get(id);
    if (!existing) return res.status(404).json({ ok: false, message: "Item não encontrado" });
    if (String(existing.source) !== "manual") {
      return res.status(400).json({ ok: false, message: "Somente itens manuais podem ser editados" });
    }

    const cod = String(req.body?.cod ?? req.body?.code ?? existing.cod ?? "").trim();
    const description = String(req.body?.description ?? req.body?.name ?? existing.description ?? "").trim();
    const unit = String(req.body?.unit ?? existing.unit ?? "").trim();

    const use = String(req.body?.use || "").toUpperCase();
    const type = req.body?.type
      ? String(req.body.type).toUpperCase()
      : use
      ? use === "P"
        ? "PRODUTO"
        : "SERVICO"
      : String(existing.type || "PRODUTO").toUpperCase();

    const sale_price = Number(req.body?.sale_price ?? req.body?.price ?? existing.sale_price ?? 0) || 0;
    const active = toIntBool(req.body?.active, existing.active);

    if (!description) {
      return res.status(400).json({ ok: false, message: "name/description é obrigatório" });
    }

    const t = nowMs();

    db.prepare(
      `UPDATE products
       SET cod = ?, description = ?, type = ?, unit = ?, sale_price = ?, active = ?, updated_at = ?
       WHERE id = ?`
    ).run(cod || null, description, type, unit || null, sale_price, active, t, id);

    const row = db.prepare(`SELECT * FROM products WHERE id = ?`).get(id);
    res.json({ ok: true, item: rowToApi(row) });
  } catch (e) {
    res.status(500).json({ ok: false, message: String(e?.message || e) });
  }
});

// -------------------------------
// DELETE /api/products/:id
// Remove produto MANUAL
// -------------------------------

router.delete("/products/:id", requireAuth, (req, res) => {
  try {
    const id = String(req.params.id || "").trim();
    if (!id) return res.status(400).json({ ok: false, message: "id é obrigatório" });

    const row = db.prepare(`SELECT id, source FROM products WHERE id = ?`).get(id);
    if (!row) return res.status(404).json({ ok: false, message: "Produto não encontrado" });
    if (row.source !== "manual") {
      return res
        .status(400)
        .json({ ok: false, message: "Somente produtos manuais podem ser removidos" });
    }

    db.prepare(`DELETE FROM products WHERE id = ?`).run(id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, message: String(e?.message || e) });
  }
});

// -------------------------------
// POST /api/products/sync-voalle
// Busca na Voalle e faz UPSERT no banco (source='voalle')
// -------------------------------

// ✅ Qualquer usuário autenticado pode solicitar sync (atualiza o catálogo para todos)
router.post("/products/sync-voalle", requireAuth, async (req, res) => {
  try {
    const token = await getVoalleToken();

    const upstream = await fetch(VOALLE_URL, {
      method: "GET",
      headers: {
        Key: "Value",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const text = await upstream.text();
    if (!upstream.ok) {
      return res.status(upstream.status).json({
        ok: false,
        message: "Erro ao consultar produtos na Voalle",
        details: text,
      });
    }

    const data = JSON.parse(text);

    // Alguns ambientes retornam {response:[...]} e outros retornam direto array
    const campaigns = Array.isArray(data?.response)
      ? data.response
      : Array.isArray(data)
      ? data
      : [];

    let rawCount = 0;
    const flattened = [];

    for (const camp of campaigns) {
      const campaignCode = camp?.code ?? "";
      const campaignTitle = camp?.title ?? "";

      const priceLists = Array.isArray(camp?.campaignPriceList)
        ? camp.campaignPriceList
        : [];

      for (const pl of priceLists) {
        const priceListId = pl?.id ?? null;
        const priceListCode = pl?.code ?? "";
        const priceListTitle = pl?.title ?? "";

        const ps = Array.isArray(pl?.campaignPriceListProductServices)
          ? pl.campaignPriceListProductServices
          : [];

        rawCount += ps.length;

        for (const p of ps) {
          // id composto evita colisão quando o mesmo code aparece em listas diferentes
          const id = `${p.code}-${priceListCode}-${campaignCode}`;

          // Campos do upstream (pode ser title ou name dependendo do ambiente)
          const title = String(p.title ?? p.name ?? "").trim();

          flattened.push({
            id,
            cod: String(p.code || "").trim() || null,
            description: title || null,
            type: mapVoalleUseToType(p.use),
            unit: null,
            sale_price: Number(p.minimumPromotionalPrice ?? p.sellingPrice ?? 0) || 0,
            active: 1,

            source: "voalle",
            use: p.use,
            original_price: Number(p.sellingPrice ?? 0) || 0,
            payment_form: p.paymentFormTitle ?? null,
            payment_form_code: p.paymentFormCode ?? null,
            is_loyalty: toIntBool(p.isLoyalty, 0),
            loyalty_price: p.loyaltyPrice ?? null,
            loyalty_months: p.monthDurationLoyalty ?? null,
            campaign_code: campaignCode,
            campaign_title: campaignTitle,
            price_list_id: priceListId,
            price_list_code: priceListCode,
            price_list_title: priceListTitle,
            raw_json: JSON.stringify(p),
          });
        }
      }
    }

    const t = nowMs();

    const upsert = db.prepare(
      `INSERT INTO products (
        id, cod, description, type, unit, sale_price, active,
        source,
        use, original_price, payment_form, payment_form_code,
        is_loyalty, loyalty_price, loyalty_months,
        campaign_code, campaign_title,
        price_list_id, price_list_code, price_list_title,
        raw_json,
        created_at, updated_at
      ) VALUES (
        @id, @cod, @description, @type, @unit, @sale_price, @active,
        @source,
        @use, @original_price, @payment_form, @payment_form_code,
        @is_loyalty, @loyalty_price, @loyalty_months,
        @campaign_code, @campaign_title,
        @price_list_id, @price_list_code, @price_list_title,
        @raw_json,
        @created_at, @updated_at
      )
      ON CONFLICT(id) DO UPDATE SET
        cod=excluded.cod,
        description=excluded.description,
        type=excluded.type,
        unit=excluded.unit,
        sale_price=excluded.sale_price,
        active=excluded.active,
        source=excluded.source,
        use=excluded.use,
        original_price=excluded.original_price,
        payment_form=excluded.payment_form,
        payment_form_code=excluded.payment_form_code,
        is_loyalty=excluded.is_loyalty,
        loyalty_price=excluded.loyalty_price,
        loyalty_months=excluded.loyalty_months,
        campaign_code=excluded.campaign_code,
        campaign_title=excluded.campaign_title,
        price_list_id=excluded.price_list_id,
        price_list_code=excluded.price_list_code,
        price_list_title=excluded.price_list_title,
        raw_json=excluded.raw_json,
        updated_at=excluded.updated_at;
      `
    );

    const tx = db.transaction((rows) => {
      let upserted = 0;
      for (const r of rows) {
        upsert.run({ ...r, created_at: t, updated_at: t });
        upserted += 1;
      }
      return upserted;
    });

    const upserted = tx(flattened);

    const totalDb = db.prepare(`SELECT COUNT(*) AS n FROM products`).get().n;
    const totalVoalleDb = db
      .prepare(`SELECT COUNT(*) AS n FROM products WHERE source='voalle'`)
      .get().n;

    res.json({
      ok: true,
      campaigns: campaigns.length,
      rawCount,
      fetched: flattened.length,
      upserted,
      totalDb,
      totalVoalleDb,
    });
  } catch (e) {
    res.status(500).json({ ok: false, message: String(e?.message || e) });
  }
});

export default router;