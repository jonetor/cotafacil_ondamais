// src/lib/cnpjUtils.js

// Remove tudo que não for número
export const onlyDigits = (s = "") => s.replace(/\D/g, "");

// Valida o dígito verificador do CNPJ
export const isValidCNPJ = (cnpj = "") => {
  cnpj = onlyDigits(cnpj);
  if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) return false;

  const calc = (x) => {
    let n = cnpj.substring(0, x);
    let s = 0;
    let p = x - 7;
    for (let i = x; i >= 1; i--) {
      s += parseInt(n.charAt(x - i)) * p--;
      if (p < 2) p = 9;
    }
    const r = s % 11 < 2 ? 0 : 11 - (s % 11);
    return r;
  };

  const d1 = calc(12);
  const d2 = calc(13);

  return d1 === parseInt(cnpj.charAt(12)) && d2 === parseInt(cnpj.charAt(13));
};

// Formata um CNPJ para o padrão 00.000.000/0000-00
export const fmtCNPJ = (d14 = "") =>
  d14 && d14.length === 14
    ? d14.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5")
    : d14 || "";