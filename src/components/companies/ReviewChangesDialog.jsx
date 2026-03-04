import React, { useState, useMemo } from 'react';
import { DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowRight } from 'lucide-react';
import { fmtCNPJ } from '@/lib/cnpjUtils';

const fieldLabels = {
    name: 'Razão Social',
    fantasia: 'Nome Fantasia',
    cnpj: 'CNPJ',
    ie: 'Inscrição Estadual',
    data_abertura: 'Data de Abertura',
    porte: 'Porte',
    natureza_juridica: 'Natureza Jurídica',
    situacao_cadastral: 'Situação Cadastral',
    data_situacao: 'Data da Situação',
    cnae_principal_codigo: 'CNAE Principal (Cód.)',
    cnae_principal_desc: 'CNAE Principal (Desc.)',
    logradouro: 'Logradouro',
    numero: 'Número',
    complemento: 'Complemento',
    bairro: 'Bairro',
    cidade: 'Município',
    uf: 'UF',
    cep: 'CEP',
    email: 'Email',
    phone: 'Telefone',
};

const formatValue = (field, value) => {
    if (field === 'cnpj') return fmtCNPJ(value);
    return value;
}

const DiffRow = ({ field, label, currentValue, newValue, isChecked, onToggle }) => {
    const formattedCurrent = formatValue(field, currentValue);
    const formattedNew = formatValue(field, newValue);
    const hasChanged = String(formattedCurrent || '') !== String(formattedNew || '');
    if (!newValue && !currentValue) return null;

    return (
        <div className={`grid grid-cols-[auto_1fr_20px_1fr] items-center gap-x-4 p-2 rounded-md ${hasChanged ? 'bg-blue-900/30' : 'bg-secondary/40'}`}>
            <Checkbox id={field} checked={isChecked} onCheckedChange={onToggle} disabled={!hasChanged} />
            <Label htmlFor={field} className="text-xs text-slate-400 truncate">{label}</Label>
            <div className="col-span-2 grid grid-cols-[1fr_auto_1fr] items-center gap-x-2">
                <span className="text-sm text-slate-300 truncate" title={formattedCurrent}>{formattedCurrent || '---'}</span>
                {hasChanged && <ArrowRight className="w-4 h-4 text-blue-400" />}
                {hasChanged && <span className="text-sm text-blue-300 font-semibold truncate" title={formattedNew}>{formattedNew || '---'}</span>}
            </div>
        </div>
    );
};

function ReviewChangesDialog({ currentData, newData, onApply, onCancel }) {
    const diff = useMemo(() => {
        const allKeys = new Set([...Object.keys(currentData), ...Object.keys(newData)]);
        const changes = {};
        allKeys.forEach(key => {
            if (key in fieldLabels && (currentData[key] || newData[key])) {
                changes[key] = {
                    current: currentData[key] || '',
                    new: newData[key] || '',
                    hasChanged: String(currentData[key] || '') !== String(newData[key] || ''),
                };
            }
        });
        return changes;
    }, [currentData, newData]);

    const [checkedFields, setCheckedFields] = useState(() => 
        Object.keys(diff).reduce((acc, key) => {
            if (diff[key].hasChanged) {
                acc[key] = true;
            }
            return acc;
        }, {})
    );

    const handleToggle = (field) => {
        setCheckedFields(prev => ({ ...prev, [field]: !prev[field] }));
    };

    const handleApply = () => {
        const changesToApply = {};
        Object.keys(checkedFields).forEach(key => {
            if (checkedFields[key]) {
                changesToApply[key] = diff[key].new;
            }
        });
        onApply(changesToApply);
    };

    return (
        <DialogContent className="glass-effect border-slate-700 text-slate-200 max-w-2xl">
            <DialogHeader>
                <DialogTitle className="text-slate-100">Revisar Alterações</DialogTitle>
                <DialogDescription className="text-slate-400 pt-2">
                    Dados foram importados. Selecione as alterações que deseja aplicar ao formulário.
                </DialogDescription>
            </DialogHeader>
            
            <div className="py-4">
                <div className="grid grid-cols-[auto_1fr_20px_1fr] items-center gap-x-4 px-2 pb-2 border-b border-slate-600">
                    <div></div>
                    <div className="text-xs font-bold text-slate-500">CAMPO</div>
                    <div className="col-span-2 grid grid-cols-[1fr_auto_1fr] items-center gap-x-2">
                        <div className="text-xs font-bold text-slate-500">VALOR ATUAL</div>
                        <div></div>
                        <div className="text-xs font-bold text-slate-500">NOVO VALOR</div>
                    </div>
                </div>
                <ScrollArea className="h-96 pr-4">
                    <div className="space-y-1 pt-2">
                        {Object.keys(diff).map(key => (
                            <DiffRow
                                key={key}
                                field={key}
                                label={fieldLabels[key]}
                                currentValue={diff[key].current}
                                newValue={diff[key].new}
                                isChecked={!!checkedFields[key]}
                                onToggle={() => handleToggle(key)}
                            />
                        ))}
                    </div>
                </ScrollArea>
            </div>

            <DialogFooter className="pt-4">
                <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
                <Button onClick={handleApply} className="btn-primary">
                    Aplicar Alterações Selecionadas
                </Button>
            </DialogFooter>
        </DialogContent>
    );
}

export default ReviewChangesDialog;