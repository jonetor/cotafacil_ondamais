// bff-node/api/companies.js
import express from "express";

const router = express.Router();

// ✅ 3 empresas fixas (as mesmas que você usa no QuoteFormPage)
const COMPANIES = [
  {
    id: "static:14429925000167",
    name: "FIBRA ONDA MAIS LTDA",
    razao_social: "FIBRA ONDA MAIS LTDA",
    nome_fantasia: "FIBRA ONDA MAIS",
    cnpj: "14.429.925/0001-67",
    cnpjDigits: "14429925000167",

    // cabeçalho PDF (já completo)
    ie: "15350790-0",
    endereco: "AV DAS NAÇÕES 2235 - CENTRO",
    cep: "CEP 68390-000",
    site: "www.ondamais.ai",
    email: "contato@ondamais.ai",
    fone: "0800 042 0900",
  },
  {
    id: "static:46322439000131",
    name: "ONDA MAIS TECNOLOGIA",
    razao_social: "ONDA MAIS TECNOLOGIA LTDA",
    nome_fantasia: "ONDA MAIS TECNOLOGIA",
    cnpj: "46.322.439/0001-31",
    cnpjDigits: "46322439000131",
    ie: "",
    endereco: "",
    cep: "",
    site: "",
    email: "",
    fone: "",
  },
];

router.get("/", (req, res) => {
  res.json({ ok: true, items: COMPANIES });
});

export default router;