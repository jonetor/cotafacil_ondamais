import React from 'react';
import { motion } from 'framer-motion';
import { Building2, MapPin, Phone, Mail, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fmtCNPJ } from '@/lib/cnpjUtils';

const CompanyCard = ({ company, index, onEdit, onDelete }) => {
    const cardVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                delay: index * 0.05,
            },
        },
    };

    return (
        <motion.div
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            layout
            className="bg-gradient-to-br from-slate-800 to-slate-900/70 rounded-lg shadow-lg p-5 flex flex-col justify-between border border-slate-700 hover:border-primary transition-all duration-300"
        >
            <div>
                <div className="flex justify-between items-start">
                    <div className="flex-1">
                        <h2 className="text-xl font-bold text-slate-100 truncate" title={company.name}>{company.name}</h2>
                        {company.fantasia && <p className="text-sm text-primary truncate" title={company.fantasia}>{company.fantasia}</p>}
                    </div>
                    <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(company)}>
                            <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-500" onClick={() => onDelete(company)}>
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                <div className="mt-4 space-y-2 text-sm text-slate-400">
                    <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-slate-500" />
                        <span>{fmtCNPJ(company.cnpj)}</span>
                    </div>
                    {company.address?.logradouro && (
                        <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-slate-500" />
                            <span className="truncate">{`${company.address.logradouro}, ${company.address.numero} - ${company.address.cidade}, ${company.address.uf}`}</span>
                        </div>
                    )}
                    {company.phone && (
                        <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-slate-500" />
                            <span>{company.phone}</span>
                        </div>
                    )}
                    {company.email && (
                        <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-slate-500" />
                            <span className="truncate">{company.email}</span>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

export default CompanyCard;