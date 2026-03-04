import { db, initDb, onlyDigits } from "./db.js";

function pick(obj, keys) {
  for (const k of keys) if (obj && obj[k] != null) return obj[k];
  return "";
}

export async function syncVoalleClients({
  getToken,
  baseUrl,
  pageSize = 5000,
  maxPages = 500
}) {
  initDb();

  const token = await getToken();

  const upsert = db.prepare(`
    INSERT INTO voalle_clients (
      id, cpf_cnpj, cpf_cnpj_digits, nome_razao, nome_fantasia,
      email, telefone, city, state, raw_json, updated_at
    ) VALUES (
      @id, @cpf_cnpj, @cpf_cnpj_digits, @nome_razao, @nome_fantasia,
      @email, @telefone, @city, @state, @raw_json, @updated_at
    )
    ON CONFLICT(id) DO UPDATE SET
      cpf_cnpj=excluded.cpf_cnpj,
      cpf_cnpj_digits=excluded.cpf_cnpj_digits,
      nome_razao=excluded.nome_razao,
      nome_fantasia=excluded.nome_fantasia,
      email=excluded.email,
      telefone=excluded.telefone,
      city=excluded.city,
      state=excluded.state,
      raw_json=excluded.raw_json,
      updated_at=excluded.updated_at
  `);

  const tx = db.transaction((rows) => {
    for (const r of rows) upsert.run(r);
  });

  let total = 0;
  let lastPageCount = 0;

  for (let page = 0; page < maxPages; page++) {
    const url = `${baseUrl}/external/integrations/thirdparty/getclient?` +
      new URLSearchParams({ page: String(page), pageSize: String(pageSize) }).toString();

    const resp = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json"
      }
    });

    const text = await resp.text();
    if (!resp.ok) {
      throw new Error(`Voalle getclient falhou (${resp.status}): ${text}`);
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`Resposta não-JSON do Voalle: ${text.slice(0, 500)}`);
    }

    // Se o Voalle responder success=false, pare com mensagem útil
    if (data?.success === false) {
      const msg = data?.messages?.[0]?.message || "Voalle retornou success=false";
      throw new Error(msg);
    }

    // ✅ FORMATO REAL: response.data é a lista
    const items =
      Array.isArray(data?.response?.data) ? data.response.data :
      Array.isArray(data?.items) ? data.items :
      Array.isArray(data?.response?.items) ? data.response.items :
      Array.isArray(data?.data) ? data.data :
      [];

    lastPageCount = items.length;

    // Se vier vazio, acabou
    if (!items.length) break;

    const rows = items.map((c) => {
      // Pelo seu JSON, o id existe e é numérico
      const id = String(pick(c, ["id", "code", "clientId", "personId"]) || "");

      const txId = pick(c, ["txId", "cpfCnpj", "cpf_cnpj", "document"]);
      const txIdFormated = pick(c, ["txIdFormated", "cpfCnpjFormated"]);

      const name = pick(c, ["name", "nome", "nomeRazao", "nome_razao", "razaoSocial"]);
      const email = pick(c, ["email", "emailNfe"]);
      const telefone = pick(c, ["cellPhone1", "cellPhone2", "phone", "telefone"]);

      const city = pick(c, ["city", "cidade"]);
      const state = pick(c, ["state", "uf"]);

      const cpfCnpjShow = String(txIdFormated || txId || "");
      const cpfCnpjDigits = onlyDigits(txId || cpfCnpjShow);

      return {
        id: id || `${page}-${Math.random()}`, // fallback (não deve acontecer)
        cpf_cnpj: cpfCnpjShow,
        cpf_cnpj_digits: cpfCnpjDigits,
        nome_razao: String(name || ""),
        // no retorno do Voalle não vi fantasia; deixo vazio (ou ajuste se existir)
        nome_fantasia: String(pick(c, ["nomeFantasia", "fantasyName", "fantasia"]) || ""),
        email: String(email || ""),
        telefone: String(telefone || ""),
        city: String(city || ""),
        state: String(state || ""),
        raw_json: JSON.stringify(c),
        updated_at: Date.now()
      };
    });

    tx(rows);
    total += rows.length;

    // Se a página veio menor que o pageSize, provavelmente é a última
    if (items.length < pageSize) break;
  }

  return { ok: true, total, lastPageCount };
}