import axios from "axios";

const onlyDigits = (s) => String(s || "").replace(/\D/g, "");

export async function cadastrarPessoaVoalle(form) {
  const txId = onlyDigits(form.documento);

  // 1=CNPJ, 2=CPF
  const typeTxId = form.tipoDoc === "CNPJ" ? 1 : 2;

  // valida tamanho
  if (typeTxId === 2 && txId.length !== 11) {
    throw new Error("CPF precisa ter 11 dígitos");
  }
  if (typeTxId === 1 && txId.length !== 14) {
    throw new Error("CNPJ precisa ter 14 dígitos");
  }

  const payload = {
    typeTxId,
    txId,
    name: form.nome,
    email: form.email || "",
    client: true,
    situation: 1,
    streetType: form.tipoLogradouro || "",
    postalCode: onlyDigits(form.cep || ""),
    street: form.rua || "",
    number: String(form.numero || ""),
    addressComplement: form.complemento || "",
    addressReference: form.referencia || "",
    neighborhood: form.bairro || "",
    city: form.cidade || "",
    codeCityId: form.codeCityId ?? null,
    state: form.uf || "",
    codeCountry: "BR"
  };

  const resp = await axios.post("/api/voalle/people", payload);
  return resp.data;
}