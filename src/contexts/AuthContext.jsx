import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';

const AuthContext = createContext(null);

// Ensure the default admin user exists
const initializeAdminUser = () => {
    try {
        const storedUsers = JSON.parse(localStorage.getItem('cota_users') || '[]');
        const adminExists = storedUsers.some(u => u.email === 'admin@ondamais.ai');
        if (!adminExists) {
            const adminUser = {
                id: 'admin-user',
                email: 'admin@ondamais.ai',
                name: 'Administrador',
                role: 'admin',
                password: '102030' // In a real app, hash this password!
            };
            storedUsers.push(adminUser);
            localStorage.setItem('cota_users', JSON.stringify(storedUsers));
        }
    } catch (error) {
        console.error("Failed to initialize admin user:", error);
    }
};
initializeAdminUser();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('cota_user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error("Failed to parse user from localStorage", error);
      setUser(null);
      localStorage.removeItem('cota_user');
    } finally {
      setLoading(false);
    }
  }, []);

  const signIn = useCallback(async (email, password) => {
    return new Promise(resolve => {
        setTimeout(() => { // Simulate async operation
            const storedUsers = JSON.parse(localStorage.getItem('cota_users') || '[]');
            const foundUser = storedUsers.find(u => u.email === email && u.password === password);

            if (foundUser) {
                const userData = { id: foundUser.id, email: foundUser.email, name: foundUser.name, role: foundUser.role };
                setUser(userData);
                localStorage.setItem('cota_user', JSON.stringify(userData));
                toast({
                    title: "Login bem-sucedido!",
                    description: `Bem-vindo de volta, ${userData.name}!`,
                });
                resolve(true);
            } else {
                toast({
                    variant: "destructive",
                    title: "Falha no login",
                    description: "Credenciais inválidas. Por favor, tente novamente.",
                });
                resolve(false);
            }
        }, 500);
    });
  }, [toast]);

  const register = useCallback((name, email, password) => {
    return new Promise(resolve => {
        let storedUsers = JSON.parse(localStorage.getItem('cota_users') || '[]');
        
        const userExists = storedUsers.some(u => u.email === email);
        if (userExists) {
          toast({
            variant: "destructive",
            title: "Falha no cadastro",
            description: "Este e-mail já está em uso. Tente outro.",
          });
          resolve(false);
          return;
        }

        const newUser = {
          id: `user-${Date.now()}`, // Simple unique ID
          name,
          email,
          password, // In a real app, hash this password!
          role: 'user', // Default role for new registrations
        };

        storedUsers.push(newUser);
        localStorage.setItem('cota_users', JSON.stringify(storedUsers));
        
        resolve(true);
    });
  }, [toast]);

  const signOut = useCallback(() => {
    setUser(null);
    localStorage.removeItem('cota_user');
    toast({
      title: "Você saiu!",
      description: "Sessão encerrada com sucesso. Até a próxima!",
    });
  }, [toast]);

  const value = { user, loading, signIn, signOut, register };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};