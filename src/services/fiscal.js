import axios from "axios";

export async function listFiscalDocs({ token, company_id, doc_type = "NFE", limit = 100 }) {
  const { data } = await axios.get("/api/fiscal/docs", {
    params: { company_id, doc_type, limit },
    headers: { Authorization: `Bearer ${token}` }
  });
  return data;
}

export async function syncFiscal({ token, doc_type = "NFE" }) {
  const { data } = await axios.post(
    `/api/fiscal/sync?doc_type=${encodeURIComponent(doc_type)}`,
    null,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return data;
}
