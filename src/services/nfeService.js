import { supabase } from '@/lib/customSupabaseClient';

    const nfeSync = async (companyId) => {
      if (!companyId) {
        throw new Error("ID da empresa é necessário para a sincronização.");
      }

      try {
        const { data, error } = await supabase.functions.invoke('nfe-distribuicao-sync', {
          body: { company_id: companyId },
        });

        if (error) {
          throw new Error(`Erro na chamada da função: ${error.message}`);
        }

        return data;
      } catch (error) {
        console.error("Erro no serviço de sincronização NFe:", error);
        throw error;
      }
    };

    export default nfeSync;