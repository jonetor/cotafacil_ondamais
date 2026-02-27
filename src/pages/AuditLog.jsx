import React from 'react';
import { Helmet } from 'react-helmet';

const AuditLog = () => {
  return (
    <div>
      <Helmet>
        <title>Auditoria | ONDA+</title>
      </Helmet>
      <h1 className="text-3xl font-bold text-slate-800">Auditoria</h1>
      <p className="text-slate-600 mt-2">Visualize os logs de atividade do sistema.</p>
    </div>
  );
};

export default AuditLog;