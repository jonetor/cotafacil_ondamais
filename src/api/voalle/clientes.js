function onlyDigits(s) {
  return String(s || "").replace(/\D/g, "");
}

function normalizeText(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function extractItems(data) {
  return Array.isArray(data?.items)
    ? data.items
    : Array.isArray(data?.response?.items)
    ? data.response.items
    : Array.isArray(data?.response)
    ? data.response
    : Array.isArray(data?.data)
    ? data.data
    : [];
}

function clientMatchesQuery(c, q) {
  const qRaw = String(q || "").trim();
  if (!qRaw) return true;

  const qDigits = onlyDigits(qRaw);
  const qNorm = normalizeText(qRaw);

  const nome =
    c?.nome ??
    c?.name ??
    c?.nome_razao ??
    c?.razaoSocial ??
    c?.razao_social ??
    "";

  const fantasia =
    c?.nomeFantasia ??
    c?.fantasyName ??
    c?.fantasia ??
    c?.nome_fantasia ??
    "";

  const doc =
    c?.cpfCnpj ??
    c?.cpf_cnpj ??
    c?.txId ??
    c?.txIdFormated ??
    c?.document ??
    "";

  const email = c?.email ?? "";
  const telefone = c?.telefone ?? c?.phone ?? "";

  if (qDigits) {
    const docDigits = onlyDigits(doc);
    const telDigits = onlyDigits(telefone);

    if (docDigits.includes(qDigits)) return true;
    if (telDigits.includes(qDigits)) return true;
  }

  if (normalizeText(nome).includes(qNorm)) return true;
  if (normalizeText(fantasia).includes(qNorm)) return true;
  if (normalizeText(email).includes(qNorm)) return true;
  if (normalizeText(telefone).includes(qNorm)) return true;

  return false;
}

function dedupeClients(list) {
  const map = new Map();

  for (const item of Array.isArray(list) ? list : []) {
    const key =
      String(item?.id ?? "") ||
      onlyDigits(item?.cpfCnpj || item?.cpf_cnpj || item?.txId || item?.document || "");

    if (!key) continue;
    if (!map.has(key)) map.set(key, item);
  }

  return Array.from(map.values());
}

app.get("/api/voalle/clientes", async (req, res) => {
  try {
    const token = await getToken();
    const baseUrl = process.env.VOALLE_BASE_URL;
    if (!baseUrl) throw new Error("VOALLE_BASE_URL não configurado");

    const q = String(req.query.q || "").trim();

    // paginação recebida da requisição
    const page = Math.max(parseInt(req.query.page ?? "0", 10), 0);
    const pageSize = Math.min(
      Math.max(parseInt(req.query.pageSize ?? "200", 10), 1),
      1000
    );

    // =========================
    // MODO SEM BUSCA
    // =========================
    // retorna só a página pedida
    if (!q) {
      const url =
        `${baseUrl}/external/integrations/thirdparty/getclient?` +
        new URLSearchParams({
          page: String(page),
          pageSize: String(pageSize),
        }).toString();

      const upstream = await fetch(url, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });

      const raw = await upstream.text();
      const contentType = upstream.headers.get("content-type") || "application/json";

      if (!upstream.ok) {
        res.status(upstream.status);
        res.setHeader("content-type", contentType);
        return res.send(raw);
      }

      const data = JSON.parse(raw);
      const items = extractItems(data);

      return res.json({
        ...data,
        page,
        pageSize,
        total: data?.total ?? items.length,
        items,
      });
    }

    // =========================
    // MODO COM BUSCA
    // =========================
    // percorre várias páginas da Voalle
    const upstreamPageSize = 500;
    const maxPages = 200;
    let currentPage = 0;
    let collected = [];
    let hasMore = true;

    while (hasMore && currentPage < maxPages) {
      const url =
        `${baseUrl}/external/integrations/thirdparty/getclient?` +
        new URLSearchParams({
          page: String(currentPage),
          pageSize: String(upstreamPageSize),
        }).toString();

      const upstream = await fetch(url, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });

      const raw = await upstream.text();
      const contentType = upstream.headers.get("content-type") || "application/json";

      if (!upstream.ok) {
        res.status(upstream.status);
        res.setHeader("content-type", contentType);
        return res.send(raw);
      }

      const data = JSON.parse(raw);
      const items = extractItems(data);

      if (!Array.isArray(items) || items.length === 0) {
        hasMore = false;
        break;
      }

      collected.push(...items);

      // se veio menos que o pageSize, acabou
      if (items.length < upstreamPageSize) {
        hasMore = false;
      } else {
        currentPage += 1;
      }
    }

    const filtered = dedupeClients(collected).filter((c) => clientMatchesQuery(c, q));

    return res.json({
      filtered: true,
      q,
      total: filtered.length,
      items: filtered,
      page: 0,
      pageSize: filtered.length,
    });
  } catch (e) {
    console.error("[/api/voalle/clientes] erro:", e);
    res.status(500).json({ error: String(e.message || e) });
  }
});