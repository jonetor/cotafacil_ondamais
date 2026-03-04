function onlyDigits(s) {
  return String(s || "").replace(/\D/g, "");
}

function normalizeText(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // remove acentos
}

app.get("/api/voalle/clientes", async (req, res) => {
  try {
    const token = await getToken();
    const baseUrl = process.env.VOALLE_BASE_URL;
    if (!baseUrl) throw new Error("VOALLE_BASE_URL não configurado");

    const page = req.query.page ?? 0;
    const pageSize = req.query.pageSize ?? 100000;

    const url =
      `${baseUrl}/external/integrations/thirdparty/getclient?` +
      new URLSearchParams({ page: String(page), pageSize: String(pageSize) }).toString();

    const upstream = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` }
    });

    const raw = await upstream.text();
    const contentType = upstream.headers.get("content-type") || "application/json";

    // repassa erro do Voalle como veio
    if (!upstream.ok) {
      res.status(upstream.status);
      res.setHeader("content-type", contentType);
      return res.send(raw);
    }

    // parse do retorno
    const data = JSON.parse(raw);

    // tente achar a lista em formatos comuns
    const items =
      Array.isArray(data.items) ? data.items :
      Array.isArray(data.response?.items) ? data.response.items :
      Array.isArray(data.response) ? data.response :
      Array.isArray(data.data) ? data.data :
      [];

    const q = String(req.query.q || "").trim();

    // se não tem q, devolve igual (mas garantindo items/total)
    if (!q) {
      return res.json({
        ...data,
        total: data.total ?? items.length,
        items
      });
    }

    const qDigits = onlyDigits(q);
    const qNorm = normalizeText(q);

    const filtered = items.filter((c) => {
      const nome = c.nome ?? c.name ?? "";
      const fantasia = c.nomeFantasia ?? c.fantasyName ?? c.fantasia ?? "";
      const doc = c.cpfCnpj ?? c.txId ?? c.document ?? "";

      // documento
      if (qDigits) {
        const docDigits = onlyDigits(doc);
        if (docDigits.includes(qDigits)) return true;
      }

      // nome / fantasia
      if (normalizeText(nome).includes(qNorm)) return true;
      if (normalizeText(fantasia).includes(qNorm)) return true;

      return false;
    });

    return res.json({
      ...data,
      filtered: true,
      q,
      total: filtered.length,
      items: filtered
    });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});