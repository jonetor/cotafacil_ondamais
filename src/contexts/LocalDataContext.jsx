import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { uid } from '@/lib/utils';

export const LocalDataContext = createContext(null);

const initialProducts = [
    { id: 'prod_001', cod: '00544', type: 'PRODUTO', description: 'EAP225(BR) - ACESS POINT DUAL AC1350', unit: 'UN', icms: 19, pis: 0.65, cofins: 3.00, purchase_price: 650.00, sale_price: 771.90, empresa_id: 'comp_001' },
    { id: 'prod_002', cod: '00653', type: 'PRODUTO', description: 'SWITCH 16-PORT G1016D GIGABIT SWITCH II', unit: 'UN', icms: 19, pis: 0.65, cofins: 3.00, purchase_price: 600.00, sale_price: 714.60, empresa_id: 'comp_001' },
    { id: 'prod_003', cod: '00660', type: 'PRODUTO', description: 'ROUTER BOARD (MIKROTIK) RB 760IGS HEX S', unit: 'UN', icms: 19, pis: 0.65, cofins: 3.00, purchase_price: 980.00, sale_price: 1174.00, empresa_id: 'comp_001' },
    { id: 'prod_004', cod: '00906', type: 'PRODUTO', description: 'CABO 100% MEGATRON 4 P CAT 5E CX 305M', unit: 'UN', icms: 19, pis: 0.65, cofins: 3.00, purchase_price: 3.50, sale_price: 4.25, empresa_id: 'comp_001' },
    { id: 'prod_005', cod: '00767', type: 'PRODUTO', description: 'SWITCH MS105GP - 5-Port Gigabit Deskt MEF', unit: 'UN', icms: 19, pis: 0.65, cofins: 3.00, purchase_price: 350.00, sale_price: 423.98, empresa_id: 'comp_001' },
    { id: 'serv_001', cod: 'S-001', type: 'SERVICO', description: 'Instalação de Ponto de Rede', issqn: 5, pis: 0.65, cofins: 3.00, sale_price: 150.00, empresa_id: 'comp_001' },
    { id: 'serv_002', cod: 'SCM-001', type: 'SERVICO_SCM', description: 'Link de Internet 100Mbps', icms: 21, pis: 0.65, cofins: 3.00, sale_price: 99.90, empresa_id: 'comp_001' }
];

const useLocalStorage = (key, initialValue) => {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue = useCallback((value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(error);
    }
  }, [key, storedValue]);

  return [storedValue, setValue];
};

export function LocalDataProvider({ children }) {
  const { user } = useAuth();
  const [companies, setCompanies] = useLocalStorage('companies', [{ id: 'comp_001', name: 'Empresa Padrão', fantasia: 'Padrão Fantasia', cnpj: '00000000000191', email: 'contato@empresa.com', phone: '11999999999', headerImageUrl: null, footerImageUrl: null }]);
  const [addresses, setAddresses] = useLocalStorage('addresses', [{ id: 'addr_001', company_id: 'comp_001', logradouro: 'Rua Principal', numero: '123', cidade: 'São Paulo', uf: 'SP', cep: '01000000' }]);
  const [clients, setClients] = useLocalStorage('clients', []);
  const [products, setProducts] = useLocalStorage('products', initialProducts);
  const [sellers, setSellers] = useLocalStorage('sellers', []);
  const [users, setUsers] = useLocalStorage('users', []);
  const [quotes, setQuotes] = useLocalStorage('quotes', []);
  const [auditLog, setAuditLog] = useLocalStorage('audit_log', []);

  const logAction = useCallback((action, details) => {
    const newLog = {
      id: uid(),
      timestamp: new Date().toISOString(),
      user: user?.email || 'System',
      action,
      details,
    };
    setAuditLog(prev => [newLog, ...prev]);
  }, [user, setAuditLog]);

  const addCompany = (companyData) => {
    setCompanies(prev => {
      if (companyData.id) {
        logAction('update_company', { id: companyData.id, name: companyData.name });
        return prev.map(c => c.id === companyData.id ? { ...c, ...companyData } : c);
      }
      const newCompany = { ...companyData, id: `comp_${uid()}` };
      logAction('add_company', { id: newCompany.id, name: newCompany.name });
      return [...prev, newCompany];
    });
    return companyData.id ? companyData : { ...companyData, id: `comp_${uid()}` };
  };

  const deleteCompany = (id) => {
    const company = companies.find(c => c.id === id);
    if(company) {
        logAction('delete_company', { id, name: company.name });
        setCompanies(prev => prev.filter(c => c.id !== id));
        setAddresses(prev => prev.filter(a => a.company_id !== id));
    }
  };

  const addAddress = (addressData) => {
    setAddresses(prev => {
        if (addressData.id) {
            return prev.map(a => a.id === addressData.id ? { ...a, ...addressData } : a);
        }
        return [...prev, { ...addressData, id: `addr_${uid()}` }];
    });
  };

  const addClient = (clientData) => {
    setClients(prev => {
        if (clientData.id) {
            logAction('update_client', { id: clientData.id, name: clientData.nome_razao });
            return prev.map(c => c.id === clientData.id ? { ...c, ...clientData } : c);
        }
        const newClient = { ...clientData, id: `client_${uid()}` };
        logAction('add_client', { id: newClient.id, name: newClient.nome_razao });
        return [...prev, newClient];
    });
  };

  const deleteClient = (id) => {
    const client = clients.find(c => c.id === id);
    if(client) {
        logAction('delete_client', { id, name: client.nome_razao });
        setClients(prev => prev.filter(c => c.id !== id));
    }
  };
  
  const addProduct = (productData) => {
    setProducts(prev => {
      if(productData.id){
        logAction('update_product', { id: productData.id, name: productData.description });
        return prev.map(p => p.id === productData.id ? {...p, ...productData} : p);
      }
      const newProduct = {...productData, id: `prod_${uid()}`};
      logAction('add_product', { id: newProduct.id, name: newProduct.description });
      return [...prev, newProduct];
    });
  };

  const removeProduct = (id) => {
    const product = products.find(p => p.id === id);
    if(product){
        logAction('delete_product', { id, name: product.description });
        setProducts(prev => prev.filter(p => p.id !== id));
    }
  };
  
  const addSeller = (sellerData) => {
    setSellers(prev => {
      if (sellerData.id) {
        logAction('update_seller', { id: sellerData.id, name: sellerData.nome });
        return prev.map(s => s.id === sellerData.id ? { ...s, ...sellerData } : s);
      }
      const newSeller = { ...sellerData, id: `seller_${uid()}` };
      logAction('add_seller', { id: newSeller.id, name: newSeller.nome });
      return [...prev, newSeller];
    });
  };
  
  const deleteSeller = (id) => {
    const seller = sellers.find(s => s.id === id);
    if(seller){
        logAction('delete_seller', { id, name: seller.nome });
        setSellers(prev => prev.filter(s => s.id !== id));
    }
  };

  const addUser = (userData) => {
    setUsers(prev => {
      if (userData.id) {
        logAction('update_user', { id: userData.id, email: userData.email });
        return prev.map(u => u.id === userData.id ? { ...u, ...userData } : u);
      }
      const newUser = { ...userData, id: `user_${uid()}` };
      logAction('add_user', { id: newUser.id, email: newUser.email });
      return [...prev, newUser];
    });
  };

  const deleteUser = (id) => {
    const userToDelete = users.find(u => u.id === id);
    if(userToDelete){
        logAction('delete_user', { id, email: userToDelete.email });
        setUsers(prev => prev.filter(u => u.id !== id));
    }
  };
  
  const addQuote = (quoteData) => {
      setQuotes(prev => {
          if (quoteData.id) {
              logAction('update_quote', { id: quoteData.id, numero: quoteData.proposta_numero });
              return prev.map(q => q.id === quoteData.id ? { ...q, ...quoteData } : q);
          }
          const newQuote = { ...quoteData, id: `quote_${uid()}` };
          logAction('add_quote', { id: newQuote.id, numero: newQuote.proposta_numero });
          return [...prev, newQuote];
      });
  };

  const deleteQuote = (id) => {
      const quote = quotes.find(q => q.id === id);
      if(quote){
          logAction('delete_quote', { id, numero: quote.proposta_numero });
          setQuotes(prev => prev.filter(q => q.id !== id));
      }
  };
  
  const value = {
    companies, addCompany, deleteCompany,
    addresses, addAddress,
    clients, addClient, deleteClient,
    products, addProduct, removeProduct,
    sellers, addSeller, deleteSeller,
    users, addUser, deleteUser,
    quotes, addQuote, deleteQuote,
    auditLog, logAction,
  };

  return <LocalDataContext.Provider value={value}>{children}</LocalDataContext.Provider>;
}

export const useLocalData = () => {
    const context = useContext(LocalDataContext);
    if (context === undefined) {
        throw new Error('useLocalData must be used within a LocalDataProvider');
    }
    return context;
};