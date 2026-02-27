import React, { createContext, useContext } from 'react';
import { useLocalData } from '@/contexts/LocalDataContext';
import { useAuth } from '@/contexts/AuthContext';

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const localData = useLocalData();
  const { user } = useAuth();
  
  const value = {
    ...localData,
    user,
  };
  
  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};