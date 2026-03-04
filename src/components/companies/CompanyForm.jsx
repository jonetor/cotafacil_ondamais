import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import InputWithMask from '@/components/ui/masked-input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { MASKS } from '@/lib/masks';
import { onlyDigits, isValidCNPJ, fmtCNPJ } from '@/lib/cnpjUtils';
import { supabase } from '@/lib/customSupabaseClient';
import ImageUpload from '@/components/companies/ImageUpload';
import CnpjImportDialog from '@/components/companies/CnpjImportDialog';
import ReviewChangesDialog from '@/components/companies/ReviewChangesDialog';
import { useToast } from '@/components/ui/use-toast';
import { Search, Loader2 } from 'lucide-react';

const emptyForm = {
    company: {
        name: '', fantasia: '', cnpj: '', ie: '', data_abertura: '', porte: '', natureza_juridica: '',
        situacao_cadastral: '', data_situacao: '', cnae_principal_codigo: '', cnae_principal_desc: '',
        cnae_secundarios: [], headerImageUrl: '', footerImageUrl: ''
    },
    address: {
        logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '', cep: ''
    },
    contact: {
        email: '', phone: ''
    }
};

function CompanyForm({ editingData, onSave, onCancel, isSubmitting, isDetailView = false }) {
    const [formData, setFormData] = useState(emptyForm);
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [reviewData, setReviewData] = useState(null);
    const [isFetchingCnpj, setIsFetchingCnpj] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (editingData) {
            const formattedCnpj = fmtCNPJ(editingData.company?.cnpj);
            setFormData({
                company: { ...emptyForm.company, ...(editingData.company || {}), cnpj: formattedCnpj },
                address: { ...emptyForm.address, ...(editingData.address || {}) },
                contact: { ...emptyForm.contact, ...(editingData.contact || {}) },
            });
        } else {
            setFormData(emptyForm);
        }
    }, [editingData]);

    const handleInputChange = (e, section) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                [name]: value
            }
        }));
    };

    const handleImageChange = (name, data) => {
        setFormData(prev => ({
            ...prev,
            company: {
                ...prev.company,
                [name]: data
            }
        }));
    };

    const handleCnaeSecundarioChange = (codigo, checked) => {
        const updatedCnaes = formData.company.cnae_secundarios.map(cnae =>
            cnae.codigo === codigo ? { ...cnae, selected: checked } : cnae
        );
        setFormData(prev => ({
            ...prev,
            company: {
                ...prev.company,
                cnae_secundarios: updatedCnaes
            }
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const cnaesSecundariosFiltrados = (formData.company.cnae_secundarios || []).filter(c => c && c.selected);
        
        const payload = {
            company: {
                ...formData.company,
                cnpj: onlyDigits(formData.company.cnpj),
                cnae_principal_codigo: onlyDigits(formData.company.cnae_principal_codigo),
                cnae_secundarios: cnaesSecundariosFiltrados,
            },
            address: {
                ...formData.address,
                cep: onlyDigits(formData.address.cep),
            },
            contact: {
                ...formData.contact,
                phone: onlyDigits(formData.contact.phone),
            }
        };
        onSave(payload);
    };

    const handleDataExtracted = (extractedData) => {
        setIsImportOpen(false);
        setReviewData({
            current: { ...formData.company, ...formData.address, ...formData.contact },
            new: { ...extractedData.companyData, ...extractedData.addressData, ...extractedData.contactData }
        });
    };

    const handleApplyChanges = (changes) => {
        const newCompanyData = { ...formData.company };
        const newAddressData = { ...formData.address };
        const newContactData = { ...formData.contact };

        Object.keys(changes).forEach(key => {
            if (key in newCompanyData) newCompanyData[key] = changes[key];
            if (key in newAddressData) newAddressData[key] = changes[key];
            if (key in newContactData) newContactData[key] = changes[key];
        });

        setFormData({
            company: { ...newCompanyData, cnpj: fmtCNPJ(newCompanyData.cnpj) },
            address: newAddressData,
            contact: newContactData
        });
        setReviewData(null);
    };

    const handleFetchCnpj = async () => {
        const digits = onlyDigits(formData.company.cnpj);
        if (!isValidCNPJ(digits)) {
            toast({
                variant: 'destructive',
                title: 'CNPJ Inválido',
                description: 'Por favor, insira um CNPJ válido e tente novamente.',
            });
            return;
        }

        setIsFetchingCnpj(true);
        try {
            const { data, error } = await supabase.functions.invoke("cnpj-lookup", {
                body: { cnpj: digits },
            });

            if (error) throw error;

            const extractedData = {
                companyData: {
                    name: data.razao_social,
                    fantasia: data.nome_fantasia,
                    cnpj: data.cnpj,
                    ie: data.inscricao_estadual,
                    data_abertura: data.data_abertura,
                    porte: data.porte,
                    natureza_juridica: data.natureza_juridica,
                    situacao_cadastral: data.situacao,
                    data_situacao: data.data_situacao,
                    cnae_principal_codigo: data.cnae_principal,
                    cnae_principal_desc: data.cnae_fiscal_descricao,
                    cnae_secundarios: data.cnaes_secundarios?.map(c => ({ ...c, selected: true })) || [],
                },
                addressData: {
                    logradouro: data.logradouro,
                    numero: data.numero,
                    complemento: data.complemento,
                    bairro: data.bairro,
                    cidade: data.municipio,
                    uf: data.uf,
                    cep: data.cep,
                    tipo_endereco: 'PRINCIPAL',
                },
                contactData: {
                    email: data.email,
                    phone: data.telefone,
                },
            };
            handleDataExtracted(extractedData);
        } catch (e) {
            const msg = e?.message || (e?.context?.status === 404 ? "CNPJ não encontrado na base." : "Falha ao consultar CNPJ.");
            toast({ variant: "destructive", title: "Erro ao buscar CNPJ", description: msg });
        } finally {
            setIsFetchingCnpj(false);
        }
    };

    const normalizeCnaeCode = (code) => {
        return code?.toString().replace(/\D/g, '').padStart(7, '0').slice(0, 7) || '';
    };

    const cnaeSecundariosValidos = (formData.company.cnae_secundarios || []).filter(c => c && c.codigo);
    
    const FormWrapper = isDetailView ? 'div' : DialogContent;
    const formProps = isDetailView ? {} : { className: "glass-effect border-slate-700 text-slate-200 max-w-4xl" };

    return (
        <FormWrapper {...formProps}>
            {!isDetailView && (
                <DialogHeader>
                    <div className="flex justify-between items-center">
                        <DialogTitle className="text-slate-100">{editingData?.company?.id ? 'Editar Empresa' : 'Nova Empresa'}</DialogTitle>
                        <Button variant="outline" size="sm" onClick={() => setIsImportOpen(true)}>Importar PDF</Button>
                    </div>
                </DialogHeader>
            )}
            <form onSubmit={handleSubmit}>
                <div className={isDetailView ? "space-y-6 py-4" : "max-h-[75vh] overflow-y-auto pr-4 -mr-4 space-y-6 py-4"}>
                    <section>
                        <h3 className="text-lg font-semibold text-primary mb-3 border-b border-primary/20 pb-2">Dados Cadastrais</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div><Label>Razão Social</Label><Input name="name" value={formData.company.name || ''} onChange={(e) => handleInputChange(e, 'company')} className="input-field" /></div>
                            <div><Label>Nome Fantasia</Label><Input name="fantasia" value={formData.company.fantasia || ''} onChange={(e) => handleInputChange(e, 'company')} className="input-field" /></div>
                            <div className="relative">
                                <Label>CNPJ</Label>
                                <InputWithMask
                                    mask={MASKS.cnpj}
                                    name="cnpj"
                                    value={formData.company.cnpj || ''}
                                    onChange={(e) => handleInputChange(e, 'company')}
                                    className="input-field pr-12"
                                    required
                                    placeholder="00.000.000/0000-00"
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-1 bottom-1 h-8 w-8"
                                    onClick={handleFetchCnpj}
                                    disabled={isFetchingCnpj || !formData.company.cnpj}
                                    title="Consultar CNPJ"
                                >
                                    {isFetchingCnpj ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                                </Button>
                            </div>
                            <div><Label>Inscrição Estadual</Label><Input name="ie" value={formData.company.ie || ''} onChange={(e) => handleInputChange(e, 'company')} className="input-field" /></div>
                            <div><Label>Data de Abertura</Label><Input name="data_abertura" value={formData.company.data_abertura || ''} onChange={(e) => handleInputChange(e, 'company')} className="input-field" type="date" /></div>
                            <div><Label>Porte</Label><Input name="porte" value={formData.company.porte || ''} onChange={(e) => handleInputChange(e, 'company')} className="input-field" /></div>
                            <div><Label>Natureza Jurídica</Label><Input name="natureza_juridica" value={formData.company.natureza_juridica || ''} onChange={(e) => handleInputChange(e, 'company')} className="input-field" /></div>
                            <div><Label>Situação Cadastral</Label><Input name="situacao_cadastral" value={formData.company.situacao_cadastral || ''} onChange={(e) => handleInputChange(e, 'company')} className="input-field" /></div>
                            <div><Label>Data da Situação</Label><Input name="data_situacao" value={formData.company.data_situacao || ''} onChange={(e) => handleInputChange(e, 'company')} className="input-field" type="date" /></div>
                        </div>
                    </section>

                    <section>
                        <h3 className="text-lg font-semibold text-primary mb-3 border-b border-primary/20 pb-2">Endereço e Contato</h3>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="md:col-span-3"><Label>Logradouro</Label><Input name="logradouro" value={formData.address.logradouro || ''} onChange={(e) => handleInputChange(e, 'address')} className="input-field" /></div>
                            <div><Label>Número</Label><Input name="numero" value={formData.address.numero || ''} onChange={(e) => handleInputChange(e, 'address')} className="input-field" /></div>
                            <div><Label>Complemento</Label><Input name="complemento" value={formData.address.complemento || ''} onChange={(e) => handleInputChange(e, 'address')} className="input-field" /></div>
                            <div><Label>Bairro</Label><Input name="bairro" value={formData.address.bairro || ''} onChange={(e) => handleInputChange(e, 'address')} className="input-field" /></div>
                            <div><Label>Município</Label><Input name="cidade" value={formData.address.cidade || ''} onChange={(e) => handleInputChange(e, 'address')} className="input-field" /></div>
                            <div><Label>UF</Label><Input name="uf" value={formData.address.uf || ''} onChange={(e) => handleInputChange(e, 'address')} className="input-field" /></div>
                            <div>
                                <Label>CEP</Label>
                                <InputWithMask
                                    mask={MASKS.cep}
                                    name="cep"
                                    value={formData.address.cep || ''}
                                    onChange={(e) => handleInputChange(e, 'address')}
                                    className="input-field"
                                    placeholder="00000-000"
                                />
                            </div>
                            <div className="md:col-span-2"><Label>Email</Label><Input name="email" value={formData.contact.email || ''} onChange={(e) => handleInputChange(e, 'contact')} type="email" className="input-field" /></div>
                            <div className="md:col-span-2">
                                <Label>Telefone</Label>
                                <InputWithMask
                                    mask={MASKS.phone}
                                    name="phone"
                                    value={formData.contact.phone || ''}
                                    onChange={(e) => handleInputChange(e, 'contact')}
                                    className="input-field"
                                    placeholder="(00) 00000-0000"
                                />
                            </div>
                        </div>
                    </section>
                    
                    <section>
                        <h3 className="text-lg font-semibold text-primary mb-3 border-b border-primary/20 pb-2">Personalização de Documentos</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <ImageUpload label="Imagem Cabeçalho (1598x200px)" value={formData.company.headerImageUrl || ''} onChange={(data) => handleImageChange('headerImageUrl', data)} />
                            <ImageUpload label="Imagem Rodapé (2480x200px)" value={formData.company.footerImageUrl || ''} onChange={(data) => handleImageChange('footerImageUrl', data)} />
                        </div>
                    </section>

                    <section>
                        <h3 className="text-lg font-semibold text-primary mb-3 border-b border-primary/20 pb-2">Atividades (CNAE)</h3>
                        <div className="space-y-4">
                            <div>
                                <h4 className="font-semibold text-foreground mb-2">Atividade Principal</h4>
                                <div className="grid grid-cols-[1fr_3fr] gap-4 p-3 bg-secondary/50 rounded-lg">
                                    <div><Label>Código</Label><Input name="cnae_principal_codigo" value={normalizeCnaeCode(formData.company.cnae_principal_codigo || '')} onChange={(e) => handleInputChange(e, 'company')} className="input-field" /></div>
                                    <div><Label>Descrição</Label><Input name="cnae_principal_desc" value={formData.company.cnae_principal_desc || ''} onChange={(e) => handleInputChange(e, 'company')} className="input-field" /></div>
                                </div>
                            </div>
                            
                            {(cnaeSecundariosValidos.length > 0) && (
                                <div>
                                    <h4 className="font-semibold text-foreground mb-2">Atividades Secundárias</h4>
                                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                                        {cnaeSecundariosValidos.map(cnae => (
                                            <div key={cnae.codigo} className="flex items-center p-3 bg-secondary/60 rounded-lg">
                                                <Checkbox
                                                    id={`cnae-${cnae.codigo}`}
                                                    checked={cnae.selected}
                                                    onCheckedChange={(checked) => handleCnaeSecundarioChange(cnae.codigo, checked)}
                                                />
                                                <Label htmlFor={`cnae-${cnae.codigo}`} className="ml-3 cursor-pointer">
                                                    <span className="font-mono text-cyan-400">{normalizeCnaeCode(cnae.codigo)}</span> - <span className="text-foreground">{cnae.descricao}</span>
                                                </Label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>

                </div>
                {!isDetailView && (
                    <DialogFooter className="pt-6">
                        <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
                        <Button type="submit" className="btn-primary" disabled={isSubmitting}>
                            {isSubmitting ? 'Salvando...' : (editingData?.company?.id ? 'Atualizar Empresa' : 'Salvar Empresa')}
                        </Button>
                    </DialogFooter>
                )}
                 {isDetailView && (
                    <div className="pt-6 flex justify-end gap-2">
                        <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
                        <Button type="submit" className="btn-primary" disabled={isSubmitting}>
                            {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
                        </Button>
                    </div>
                )}
            </form>

            <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
                <CnpjImportDialog onDataExtracted={handleDataExtracted} onCancel={() => setIsImportOpen(false)} />
            </Dialog>

            <Dialog open={!!reviewData} onOpenChange={() => setReviewData(null)}>
                {reviewData && (
                    <ReviewChangesDialog 
                        currentData={reviewData.current}
                        newData={reviewData.new}
                        onApply={handleApplyChanges}
                        onCancel={() => setReviewData(null)}
                    />
                )}
            </Dialog>
        </FormWrapper>
    );
}

export default CompanyForm;