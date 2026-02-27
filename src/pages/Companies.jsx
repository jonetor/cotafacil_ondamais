import React, { useState, useMemo } from 'react';
    import { Helmet } from 'react-helmet';
    import { motion, AnimatePresence } from 'framer-motion';
    import { Building2, Plus, Search, Trash2 } from 'lucide-react';
    import { useData } from '@/contexts/SupabaseDataContext';
    import { useToast } from '@/components/ui/use-toast';
    import { Button } from '@/components/ui/button';
    import { Input } from '@/components/ui/input';
    import { Dialog, DialogTrigger } from '@/components/ui/dialog';
    import CompanyForm from '@/components/companies/CompanyForm';
    import CompanyCard from '@/components/companies/CompanyCard';
    import { fmtCNPJ } from '@/lib/cnpjUtils';
    import {
      AlertDialog,
      AlertDialogAction,
      AlertDialogCancel,
      AlertDialogContent,
      AlertDialogDescription,
      AlertDialogFooter,
      AlertDialogHeader,
      AlertDialogTitle,
    } from "@/components/ui/alert-dialog";
    import { useNavigate } from 'react-router-dom';
    
    const Companies = () => {
        const { companies, addCompany, deleteCompany, addresses, addAddress } = useData();
        const { toast } = useToast();
        const navigate = useNavigate();
        const [isFormOpen, setIsFormOpen] = useState(false);
        const [editingData, setEditingData] = useState(null);
        const [isSubmitting, setIsSubmitting] = useState(false);
        const [searchTerm, setSearchTerm] = useState('');
        const [companyToDelete, setCompanyToDelete] = useState(null);
    
        const companiesWithAddresses = useMemo(() => {
            if (!companies || !addresses) return [];
            return companies.map(company => {
                const companyAddresses = addresses.filter(addr => addr.company_id === company.id);
                const primaryAddress = companyAddresses.find(addr => addr.is_primary) || companyAddresses[0] || {};
                return {
                    ...company,
                    address: primaryAddress,
                };
            });
        }, [companies, addresses]);
    
        const filteredCompanies = useMemo(() => {
            return companiesWithAddresses.filter(company =>
                company.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                company.fantasia?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                company.cnpj?.replace(/\D/g, '').includes(searchTerm.replace(/\D/g, ''))
            );
        }, [companiesWithAddresses, searchTerm]);
    
        const handleNewCompany = () => {
            setEditingData(null);
            setIsFormOpen(true);
        };
        
        const handleEditCompany = (company) => {
            navigate(`/empresas/${company.id}`);
        };
    
        const handleSaveCompany = async (formData) => {
            setIsSubmitting(true);
            try {
                const { company: companyData, address: addressData, contact: contactData } = formData;
                
                const savedCompany = await addCompany({ ...companyData, email: contactData.email, phone: contactData.phone });
    
                if (savedCompany && (Object.values(addressData).some(v => v))) {
                    await addAddress({
                        ...addressData,
                        id: addressData.id || undefined,
                        company_id: savedCompany.id,
                        tipo_endereco: addressData.tipo_endereco || 'PRINCIPAL',
                        is_primary: true
                    });
                }
    
                toast({
                    title: `Empresa ${companyData.id ? 'atualizada' : 'criada'} com sucesso!`,
                    description: `A empresa "${savedCompany.name}" foi salva.`,
                });
                setIsFormOpen(false);
                setEditingData(null);
            } catch (error) {
                console.error(error);
                toast({
                    variant: 'destructive',
                    title: 'Erro ao salvar',
                    description: 'Não foi possível salvar a empresa.',
                });
            } finally {
                setIsSubmitting(false);
            }
        };
        
        const handleDeleteCompany = (id) => {
            deleteCompany(id);
            toast({ title: "Empresa excluída com sucesso!" });
            setCompanyToDelete(null);
        };
    
        return (
            <div className="text-slate-200 min-h-full -m-8 p-8">
                <Helmet>
                    <title>Empresas | CotaFácil</title>
                </Helmet>
                <div className="space-y-8">
                    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <h1 className="text-3xl font-bold text-slate-100">Empresas</h1>
                                <p className="text-slate-400 mt-1">Gerencie suas empresas e filiais.</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                                    <DialogTrigger asChild>
                                        <Button className="btn-primary" onClick={handleNewCompany}>
                                            <Plus className="w-4 h-4 mr-2" /> Nova Empresa
                                        </Button>
                                    </DialogTrigger>
                                    <CompanyForm 
                                        editingData={editingData}
                                        onSave={handleSaveCompany} 
                                        onCancel={() => {
                                            setIsFormOpen(false);
                                            setEditingData(null);
                                        }}
                                        isSubmitting={isSubmitting}
                                    />
                                </Dialog>
                            </div>
                        </div>
                    </motion.div>
    
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                        <Input 
                            placeholder="Buscar por nome, fantasia ou CNPJ..." 
                            className="pl-10 w-full md:w-1/3 input-field"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(fmtCNPJ(e.target.value))}
                        />
                    </div>
    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <AnimatePresence>
                            {filteredCompanies.map((company, index) => (
                                <CompanyCard 
                                    key={company.id} 
                                    company={company} 
                                    index={index} 
                                    onEdit={handleEditCompany} 
                                    onDelete={() => setCompanyToDelete(company)} 
                                />
                            ))}
                        </AnimatePresence>
                    </div>
                     {filteredCompanies.length === 0 && (
                        <div className="text-center py-16 text-slate-500 col-span-full">
                            <Building2 className="w-16 h-16 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold">Nenhuma empresa encontrada</h3>
                            <p>Tente ajustar sua busca ou adicione uma nova empresa.</p>
                        </div>
                     )}
                </div>
                 <AlertDialog open={!!companyToDelete} onOpenChange={() => setCompanyToDelete(null)}>
                    <AlertDialogContent className="glass-effect border-slate-700 text-slate-200">
                        <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center text-slate-100"><Trash2 className="w-5 h-5 mr-2 text-red-400"/>Confirmar Exclusão</AlertDialogTitle>
                            <AlertDialogDescription className="text-slate-400">
                                Tem certeza de que deseja excluir a empresa <span className="font-bold text-amber-400">{companyToDelete?.name}</span>? Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteCompany(companyToDelete.id)} className="bg-red-500 hover:bg-red-600">Excluir</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        );
    };
    
    export default Companies;