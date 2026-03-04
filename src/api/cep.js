import axios from "axios";

export async function buscarCep(cepInput) {
  const cep = String(cepInput || "").replace(/\D/g, "");
  if (cep.length !== 8) return null;

  const { data } = await axios.get(`/api/cep/${cep}`);
  // ViaCEP retorna { erro: true } quando não acha
  if (data?.erro) return null;
  return data;
}