import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';

const DataContext = createContext(null);

export const useData = () => {
  const context = useContext(DataContext);
  if (context === null) {
    throw new Error('useData must be used within a SupabaseDataProvider');
  }
  return context;
};

const DataProviderLogic = ({ children }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);

  const [companies, setCompanies] = useState([]);
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [users, setUsers] = useState([]);

  const fetchData = useCallback(
    async (tableName, setter) => {
      if (!user) return;
      try {
        const { data, error } = await supabase.from(tableName).select('*');
        if (error) throw error;
        setter(data);
      } catch (error) {
        toast({
          variant: 'destructive',
          title: `Erro ao buscar ${tableName}`,
          description: error.message,
        });
      }
    },
    [user, toast]
  );

  useEffect(() => {
    if (user) {
      setLoading(true);
      Promise.all([
        fetchData('companies', setCompanies),
        fetchData('clients', setClients),
        fetchData('products', setProducts),
        fetchData('sellers', setSellers),
        fetchData('addresses', setAddresses),
        fetchData('user_profiles', setUsers),
        fetchData('quotes', async (data) => {
          const quotesWithItems = await Promise.all(
            data.map(async (quote) => {
              const { data: items, error } = await supabase
                .from('quote_items')
                .select('*')
                .eq('quote_id', quote.id);

              if (error) {
                console.error('Error fetching quote items:', error);
                return { ...quote, items: [] };
              }
              return { ...quote, items: items || [] };
            })
          );
          setQuotes(quotesWithItems);
        }),
      ]).finally(() => setLoading(false));
    } else {
      setCompanies([]);
      setClients([]);
      setProducts([]);
      setSellers([]);
      setQuotes([]);
      setAddresses([]);
      setUsers([]);
      setLoading(false);
    }
  }, [user, fetchData]);

  const handleSupabaseUpsert = async (tableName, data, setter) => {
    if (!user?.id) {
      const err = new Error('Usuário não autenticado.');
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: err.message });
      throw err;
    }

    const payload = { ...data, user_id: user.id };

    // timestamps
    if (payload.id) {
      payload.updated_at = new Date().toISOString();
    } else {
      payload.created_at = new Date().toISOString();
      payload.updated_at = new Date().toISOString();
    }

    const { data: result, error } = await supabase
      .from(tableName)
      .upsert(payload)
      .select()
      .single();

    if (error) {
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: error.message });
      throw error;
    }

    setter((prev) => {
      const existingIndex = prev.findIndex((item) => item.id === result.id);
      if (existingIndex > -1) {
        const newItems = [...prev];
        newItems[existingIndex] = result;
        return newItems;
      }
      return [...prev, result];
    });

    return result;
  };

  // ✅ NOVO: sanitização específica para clients (remove campos que não existem no schema)
  const sanitizeClientPayload = (client) => {
    const clean = { ...client };
    delete clean.cnae_principal; // remove campo problemático que gerou PGRST204
    return clean;
  };

  const handleDelete = async (tableName, id, setter) => {
    const { error } = await supabase.from(tableName).delete().eq('id', id);
    if (error) {
      toast({ variant: 'destructive', title: 'Erro ao deletar', description: error.message });
      return;
    }
    setter((prev) => prev.filter((item) => item.id !== id));
  };

  const addCompany = (company) => handleSupabaseUpsert('companies', company, setCompanies);
  const deleteCompany = (id) => handleDelete('companies', id, setCompanies);

  const addAddress = (address) => handleSupabaseUpsert('addresses', address, setAddresses);

  // ✅ ALTERADO: passa pela sanitização antes de salvar
  const addClient = (client) => handleSupabaseUpsert('clients', sanitizeClientPayload(client), setClients);
  const deleteClient = (id) => handleDelete('clients', id, setClients);

  const addProduct = (product) => handleSupabaseUpsert('products', product, setProducts);
  const deleteProduct = (id) => handleDelete('products', id, setProducts);

  const addSeller = (seller) => handleSupabaseUpsert('sellers', seller, setSellers);
  const deleteSeller = (id) => handleDelete('sellers', id, setSellers);

  const addUser = async (userData) => {
    const { data, error } = await supabase.from('user_profiles').upsert(userData).select().single();
    if (error) {
      toast({ variant: 'destructive', title: 'Erro ao salvar usuário', description: error.message });
      return null;
    }
    setUsers((prev) => {
      const existing = prev.find((u) => u.id === data.id);
      if (existing) {
        return prev.map((u) => (u.id === data.id ? data : u));
      }
      return [...prev, data];
    });
    return data;
  };
  const deleteUser = (id) => handleDelete('user_profiles', id, setUsers);

  const addQuote = async (quoteData) => {
    const { items, ...quotePayload } = quoteData;
    const quoteResult = await handleSupabaseUpsert('quotes', quotePayload, setQuotes);

    if (quoteResult) {
      if (quoteResult.id) {
        const { error: deleteError } = await supabase
          .from('quote_items')
          .delete()
          .eq('quote_id', quoteResult.id);

        if (deleteError) {
          toast({ variant: 'destructive', title: 'Erro ao atualizar itens', description: deleteError.message });
        }
      }

      if (items && items.length > 0) {
        const itemsPayload = items.map(({ uid, ...item }) => ({
          ...item,
          quote_id: quoteResult.id,
          user_id: user.id,
        }));

        const { data: newItems, error: itemsError } = await supabase
          .from('quote_items')
          .insert(itemsPayload)
          .select();

        if (itemsError) {
          toast({ variant: 'destructive', title: 'Erro ao salvar itens', description: itemsError.message });
        } else {
          setQuotes((prev) => {
            const existingIndex = prev.findIndex((q) => q.id === quoteResult.id);
            if (existingIndex > -1) {
              const updatedQuotes = [...prev];
              const quoteToUpdate = updatedQuotes[existingIndex];
              updatedQuotes[existingIndex] = { ...quoteToUpdate, ...quoteResult, items: newItems || [] };
              return updatedQuotes;
            }
            return [...prev, { ...quoteResult, items: newItems || [] }];
          });
        }
      } else {
        setQuotes((prev) => {
          const existingIndex = prev.findIndex((q) => q.id === quoteResult.id);
          if (existingIndex > -1) {
            const updatedQuotes = [...prev];
            const quoteToUpdate = updatedQuotes[existingIndex];
            updatedQuotes[existingIndex] = { ...quoteToUpdate, ...quoteResult, items: [] };
            return updatedQuotes;
          }
          return [...prev, { ...quoteResult, items: [] }];
        });
      }
    }

    return quoteResult;
  };

  const deleteQuote = async (id) => {
    const { error: itemError } = await supabase.from('quote_items').delete().eq('quote_id', id);
    if (itemError) {
      toast({ variant: 'destructive', title: 'Erro ao remover itens da cotação.', description: itemError.message });
    }
    await handleDelete('quotes', id, setQuotes);
  };

  const value = {
    loading,
    user,
    companies,
    addCompany,
    deleteCompany,
    clients,
    addClient,
    deleteClient,
    products,
    addProduct,
    removeProduct: deleteProduct,
    sellers,
    addSeller,
    deleteSeller,
    quotes,
    addQuote,
    deleteQuote,
    addresses,
    addAddress,
    users,
    addUser,
    deleteUser,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const SupabaseDataProvider = ({ children }) => {
  return <DataProviderLogic>{children}</DataProviderLogic>;
};