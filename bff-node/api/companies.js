// bff-node/api/companies.js
import express from "express";

const router = express.Router();

// ✅ 3 empresas fixas (as mesmas que você usa no QuoteFormPage)
const COMPANIES = [
  {
    id: "static:14429925000167",
    name: "Fibra Onda+ LTDA",
    razao_social: "Fibra Onda Mais LTDA",
    nome_fantasia: "Fibra Onda Mais",
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
    name: "Onda Mais Tecnologia",
    razao_social: "Onda Mais Tecnologia LTDA",
    nome_fantasia: "Onda Mais Tecnologia",
    cnpj: "46.322.439/0001-31",
    cnpjDigits: "46322439000131",
    ie: "",
    endereco: "",
    cep: "",
    site: "",
    email: "",
    fone: "",
  },
  {
    id: "static:44618753000130",
    name: "S & A Invest",
    razao_social: "S & A Invest LTDA",
    nome_fantasia: "S & A Invest",
    cnpj: "44.618.753/0001-30",
    cnpjDigits: "44618753000130",
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