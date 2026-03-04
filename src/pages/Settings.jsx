import React from 'react';
import { Helmet } from 'react-helmet';

const Settings = () => {
  return (
    <div className="text-slate-200">
      <Helmet>
        <title>Configurações | ONDA+</title>
      </Helmet>
      <h1 className="text-3xl font-bold text-slate-100">Configurações</h1>
      <p className="text-slate-400 mt-2">Ajuste as configurações gerais do sistema.</p>
    </div>
  );
};

export default Settings;