import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/App';
import '@/index.css';
import { AuthProvider } from '@/contexts/SupabaseAuthContext';
import { SupabaseDataProvider } from '@/contexts/SupabaseDataContext';
import { OrcamentoProvider } from "@/contexts/OrcamentoContext";

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <SupabaseDataProvider>
          <OrcamentoProvider>
            <App />
          </OrcamentoProvider>
      </SupabaseDataProvider>
    </AuthProvider>
  </React.StrictMode>
);