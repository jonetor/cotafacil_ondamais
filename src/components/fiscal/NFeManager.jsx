import React, { useState, useEffect } from 'react';
    import { useData } from '@/contexts/SupabaseDataContext';
    import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
    import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
    import { Button } from '@/components/ui/button';
    import { useNavigate } from 'react-router-dom';
    import NFeRecebidas from '@/components/fiscal/nfe/NFeRecebidas';
    import { FileText, Settings, AlertTriangle, Fingerprint } from 'lucide-react';
    import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
    import { supabase } from '@/lib/customSupabaseClient';
    import { useToast } from '@/components/ui/use-toast';

    const NFeManager = () => {
        const { companies } = useData();
        const { toast } = useToast();
        const navigate = useNavigate();
        const [activeTab, setActiveTab] = useState("recebidas");
        const [selectedCompanyId, setSelectedCompanyId] = useState('');
        const [hasActiveCert, setHasActiveCert] = useState(false);
        const [isLoadingCertStatus, setIsLoadingCertStatus] = useState(false);

        useEffect(() => {
            if (companies && companies.length > 0 && !selectedCompanyId) {
                setSelectedCompanyId(companies[0].id);
            }
        }, [companies, selectedCompanyId]);

        useEffect(() => {
            const checkCertificate = async () => {
                if (!selectedCompanyId) {
                    setHasActiveCert(false);
                    return;
                }
                setIsLoadingCertStatus(true);
                const { data, error } = await supabase
                    .from('nfe_certificates')
                    .select('id')
                    .eq('company_id', selectedCompanyId)
                    .eq('active', true)
                    .limit(1);

                if (error) {
                    toast({ variant: 'destructive', title: 'Erro ao verificar certificado', description: error.message });
                    setHasActiveCert(false);
                } else {
                    setHasActiveCert(data && data.length > 0);
                }
                setIsLoadingCertStatus(false);
            };

            checkCertificate();
        }, [selectedCompanyId, toast]);

        const handleGoToConfig = () => {
            if (selectedCompanyId) {
                navigate(`/empresas/${selectedCompanyId}/certificado-digital`);
            }
        };

        return (
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-foreground">Gerenciador de NFe</h2>
                        <p className="text-muted-foreground">Consulte e sincronize documentos fiscais eletrônicos.</p>
                    </div>
                    <div className="w-full sm:w-auto min-w-[250px]">
                        <Select onValueChange={setSelectedCompanyId} value={selectedCompanyId}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Selecione uma empresa..." />
                            </SelectTrigger>
                            <SelectContent>
                                {companies.map(company => (
                                    <SelectItem key={company.id} value={company.id}>
                                        {company.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {!isLoadingCertStatus && !hasActiveCert && selectedCompanyId && (
                    <Card className="border-amber-500 bg-amber-500/10">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-amber-600">
                                <AlertTriangle /> Ação Necessária
                            </CardTitle>
                            <CardDescription>
                                A empresa selecionada não possui um certificado digital ativo.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="mb-4 text-sm text-muted-foreground">
                                Para sincronizar documentos, é necessário configurar um certificado digital A1 para o ambiente de produção ou homologação.
                            </p>
                            <Button onClick={handleGoToConfig}>
                                <Fingerprint className="mr-2 h-4 w-4" />
                                Configurar Certificado
                            </Button>
                        </CardContent>
                    </Card>
                )}

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-1">
                        <TabsTrigger value="recebidas">
                            <FileText className="mr-2 h-4 w-4" />
                            Documentos Recebidos
                        </TabsTrigger>
                    </TabsList>
                    <TabsContent value="recebidas" className="mt-4">
                        <NFeRecebidas companyId={selectedCompanyId} isEnabled={hasActiveCert} />
                    </TabsContent>
                </Tabs>
            </div>
        );
    };

    export default NFeManager;