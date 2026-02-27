import React, { useState, useEffect } from 'react';
    import { useParams, useNavigate } from 'react-router-dom';
    import { useData } from '@/contexts/SupabaseDataContext';
    import { Helmet } from 'react-helmet';
    import { Loader2, ArrowLeft, Building, Fingerprint } from 'lucide-react';
    import { Button } from '@/components/ui/button';
    import CompanyForm from '@/components/companies/CompanyForm';
    import { useToast } from '@/components/ui/use-toast';
    import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
    import NFeConfig from '@/components/fiscal/nfe/NFeConfig';

    const CompanyDetailPage = () => {
        const { id, tab = 'dados' } = useParams();
        const navigate = useNavigate();
        const { companies, addresses, addCompany, addAddress, loading } = useData();
        const { toast } = useToast();
        const [companyData, setCompanyData] = useState(null);
        const [isSubmitting, setIsSubmitting] = useState(false);

        useEffect(() => {
            if (!loading) {
                const company = companies.find(c => c.id === id);
                if (company) {
                    const address = addresses.find(a => a.company_id === id && a.is_primary) || addresses.find(a => a.company_id === id) || {};
                    const contact = { email: company.email, phone: company.phone };
                    setCompanyData({ company, address, contact });
                } else {
                    navigate('/empresas');
                }
            }
        }, [id, companies, addresses, loading, navigate]);

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
                toast({ title: "Empresa atualizada com sucesso!" });
            } catch (error) {
                toast({ variant: 'destructive', title: 'Erro ao salvar', description: 'Não foi possível salvar a empresa.' });
            } finally {
                setIsSubmitting(false);
            }
        };

        const handleTabChange = (newTab) => {
            navigate(`/empresas/${id}/${newTab}`);
        };

        if (loading || !companyData) {
            return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>;
        }

        return (
            <>
                <Helmet>
                    <title>Detalhes da Empresa | {companyData.company.name}</title>
                </Helmet>
                <div className="container mx-auto p-4 md:p-6 lg:p-8">
                    <div className="flex items-center gap-4 mb-6">
                        <Button variant="ghost" size="icon" onClick={() => navigate('/empresas')}>
                            <ArrowLeft />
                        </Button>
                        <div>
                            <h1 className="text-3xl font-bold">{companyData.company.name}</h1>
                            <p className="text-muted-foreground">{companyData.company.fantasia}</p>
                        </div>
                    </div>

                    <Tabs value={tab} onValueChange={handleTabChange} className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="dados">
                                <Building className="mr-2 h-4 w-4" />
                                Dados da Empresa
                            </TabsTrigger>
                            <TabsTrigger value="certificado-digital">
                                <Fingerprint className="mr-2 h-4 w-4" />
                                Certificado Digital (NF-e)
                            </TabsTrigger>
                        </TabsList>
                        <TabsContent value="dados" className="mt-4">
                             <main className="bg-card p-6 rounded-lg border">
                                <CompanyForm
                                    editingData={companyData}
                                    onSave={handleSaveCompany}
                                    onCancel={() => navigate('/empresas')}
                                    isSubmitting={isSubmitting}
                                    isDetailView={true}
                                />
                            </main>
                        </TabsContent>
                        <TabsContent value="certificado-digital" className="mt-4">
                            <NFeConfig companyId={id} />
                        </TabsContent>
                    </Tabs>
                </div>
            </>
        );
    };

    export default CompanyDetailPage;