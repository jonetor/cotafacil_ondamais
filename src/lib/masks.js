export const MASKS = {
        cpf: '000.000.000-00',
        cnpj: '00.000.000/0000-00',
        cep: '00000-000',
        phone: [
            {
              mask: '(00) 0000-0000',
            },
            {
              mask: '(00) 00000-0000',
            }
        ]
    };
    
    export const cpfMask = value => {
      if (!value) return "";
      return value
        .replace(/\D/g, '')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})/, '$1-$2')
        .replace(/(-\d{2})\d+?$/, '$1');
    };
    
    export const cnpjMask = value => {
      if (!value) return "";
      return value
        .replace(/\D/g, '')
        .replace(/(\d{2})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2')
        .replace(/(-\d{2})\d+?$/, '$1');
    };
    
    export const phoneMask = value => {
      if (!value) return "";
      return value
        .replace(/\D/g, '')
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d{4})/, '$1-$2')
        .replace(/(\d{4})(\d{4})/, '$1-$2');
    };
    
    export const cepMask = value => {
      if (!value) return "";
      return value
        .replace(/\D/g, '')
        .replace(/(\d{5})(\d)/, '$1-$2')
        .replace(/(-\d{3})\d+?$/, '$1');
    };
    
    export const onlyDigits = (s = "") => s.replace(/\D/g, "");

    export const validateCnpj = (cnpj) => {
      cnpj = onlyDigits(cnpj);
      if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) return false;
      let t = cnpj.length - 2;
      let d = cnpj.substring(t);
      let n = cnpj.substring(0, t);
      const calc = (x) => {
        let s = 0;
        let p = x - 7;
        for (let i = x; i >= 1; i--) {
          s += parseInt(n.charAt(x - i), 10) * p--;
          if (p < 2) p = 9;
        }
        const r = s % 11 < 2 ? 0 : 11 - (s % 11);
        return r;
      };
      if (calc(12) !== parseInt(d.charAt(0), 10)) return false;
      n = cnpj.substring(0, ++t);
      return calc(13) === parseInt(d.charAt(1), 10);
    };
    
    export const validateCpf = (cpf) => {
      if (!cpf) return false;
      const cpfClean = cpf.replace(/[^\d]+/g, '');
    
      if (cpfClean.length !== 11 || /^(\d)\1+$/.test(cpfClean)) {
        return false;
      }
    
      let sum = 0;
      let remainder;
    
      for (let i = 1; i <= 9; i++) {
        sum += parseInt(cpfClean.substring(i - 1, i), 10) * (11 - i);
      }
    
      remainder = (sum * 10) % 11;
      if (remainder === 10 || remainder === 11) {
        remainder = 0;
      }
    
      if (remainder !== parseInt(cpfClean.substring(9, 10), 10)) {
        return false;
      }
    
      sum = 0;
      for (let i = 1; i <= 10; i++) {
        sum += parseInt(cpfClean.substring(i - 1, i), 10) * (12 - i);
      }
    
      remainder = (sum * 10) % 11;
      if (remainder === 10 || remainder === 11) {
        remainder = 0;
      }
    
      if (remainder !== parseInt(cpfClean.substring(10, 11), 10)) {
        return false;
      }
    
      return true;
    };