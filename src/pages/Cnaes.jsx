import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Search, Tag } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

function Cnaes() {
  const { cnaes } = useData();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCnaes = cnaes.filter(cnae => 
    cnae.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cnae.descricao.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Catálogo de CNAEs</h1>
          <p className="text-white/60">Consulte os códigos de atividade econômica cadastrados no sistema.</p>
        </div>
      </div>
      
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/50" />
        <Input 
          type="text" 
          placeholder="Buscar por código ou descrição..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input-field pl-10"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCnaes.length > 0 ? filteredCnaes.map((cnae, index) => (
          <motion.div key={cnae.id || cnae.codigo} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
             <Card className="glass-effect border-white/10 text-white h-full">
                <CardHeader>
                    <CardTitle className="flex items-center text-lg">
                        <Tag className="w-5 h-5 mr-3 text-sky-400" />
                        {cnae.codigo}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-white/80">{cnae.descricao}</p>
                </CardContent>
             </Card>
          </motion.div>
        )) : (
            <div className="col-span-full text-center py-12">
                <FileText className="w-16 h-16 text-white/30 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">Nenhum CNAE encontrado</h3>
                <p className="text-white/60">
                    {searchTerm 
                        ? "Nenhum resultado para sua busca. Tente outros termos." 
                        : "O catálogo está vazio. Importe um Cartão CNPJ para adicionar CNAEs."
                    }
                </p>
            </div>
        )}
      </div>
    </div>
  );
}

export default Cnaes;