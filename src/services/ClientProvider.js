import axios from 'axios';
import { supabase } from '@/lib/customSupabaseClient';

// ✅ agora o CEP deve ir pelo BFF (mesma origem), não direto no viacep.com.br
const bffApi = axios.create({
  baseURL: '/api',
  timeout: 8000,
});

const onlyDigits = (v) => String(v || '').replace(/\D/g, '');

const logError = (provider, error) => {
  console.error(`[${provider} Error]`, {
    message: error?.message,
    details: error,
  });
};

// =====================
// ✅ CNPJ LOOKUP (Supabase Function)
// =====================
export const fetchCnpjData = async (cnpj) => {
  try {
    const cleanCnpj = onlyDigits(cnpj);

    // ✅ proteção: evita “CNPJ não fornecido.”
    if (cleanCnpj.length !== 14) {
      throw new Error('CNPJ inválido: informe 14 dígitos antes de buscar.');
    }

    const { data, error } = await supabase.functions.invoke('cnpj-lookup', {
      body: { cnpj: cleanCnpj },
    });

    if (error) {
      logError('Supabase Function (cnpj-lookup)', error);

      // tenta extrair mensagem amigável quando vier contexto
      if (error.context) {
        try {
          const functionError = error.context.json
            ? await error.context.json()
            : { error: error.context.statusText };

          throw new Error(
            functionError.error || `Erro ${error.context.status}: ${error.context.statusText}`
          );
        } catch {
          throw new Error(error.message || 'Erro ao invocar a função do Supabase.');
        }
      }

      throw new Error(error.message || 'Erro ao invocar a função do Supabase.');
    }

    if (!data) {
      throw new Error('Nenhum dado retornado pela função.');
    }

    console.log({
      source: 'Supabase Function (cnpj-lookup)',
      timestamp: new Date().toISOString(),
      document: cleanCnpj,
      status: 'success',
    });

    return data;
  } catch (error) {
    logError('fetchCnpjData', error);
    throw error;
  }
};

// =====================
// CPF (mantém comportamento)
// =====================
export const fetchCpfData = async (cpf) => {
  console.warn('[CPF Provider] A consulta de CPF não está implementada para proteger dados pessoais.');
  return null;
};

// =====================
// ✅ CEP via BFF (sem CSP)
// =====================
const mapViaCepToAddress = (data) => ({
  logradouro: data.logradouro || '',
  bairro: data.bairro || '',
  cidade: data.localidade || data.cidade || '',
  uf: data.uf || '',
  ibge: data.ibge || '',
});

export const fetchCepData = async (cep) => {
  try {
    const cleanCep = onlyDigits(cep);
    if (cleanCep.length !== 8) throw new Error('CEP inválido');

    // ✅ chama seu BFF: /api/cep/:cep
    const { data } = await bffApi.get(`/cep/${cleanCep}`);

    if (data?.erro) {
      throw new Error('CEP não encontrado.');
    }

    console.log({
      source: 'ViaCEP (via BFF)',
      timestamp: new Date().toISOString(),
      cep: cleanCep,
      status: 'success',
    });

    return mapViaCepToAddress(data);
  } catch (error) {
    logError('fetchCepData', error);

    if (error?.code === 'ECONNABORTED' || String(error?.message || '').includes('timeout')) {
      throw new Error('A consulta demorou muito para responder (timeout). Tente novamente.');
    }

    // axios: erro HTTP
    if (error?.response) {
      const msg =
        error.response.data?.error ||
        error.response.data?.message ||
        `Falha ao consultar CEP (HTTP ${error.response.status}).`;

      throw new Error(msg);
    }

    throw new Error('Erro de rede. Verifique sua conexão e tente novamente.');
  }
};