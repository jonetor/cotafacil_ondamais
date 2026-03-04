import React, { useState, useEffect, useCallback } from 'react';
    import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
    import { Button } from '@/components/ui/button';
    import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
    import { useToast } from '@/components/ui/use-toast';
    import { supabase } from '@/lib/customSupabaseClient';
    import { RefreshCw, Loader2, Filter } from 'lucide-react';
    import { format } from 'date-fns';
    import { formatCurrencyBR } from '@/lib/utils';
    import nfeSync from '@/services/nfeService';

    const NFeRecebidas = () => {
        const { toast } = useToast();
        const [documents, setDocuments] = useState([]);
        const [isLoading, setIsLoading] = useState(false);
        const [isSyncing, setIsSyncing] = useState(false);

        const fetchDocuments = useCallback(async () => {
            setIsLoading(true);
            const { data, error } = await supabase
                .from('nfe_documents')
                .select('*')
                .order('dhemi', { ascending: false })
                .limit(100);

            if (error) {
                toast({ variant: 'destructive', title: 'Erro ao buscar documentos', description: error.message });
            } else {
                setDocuments(data);
            }
            setIsLoading(false);
        }, [toast]);

        useEffect(() => {
            fetchDocuments();
        }, [fetchDocuments]);

        const handleSync = async () => {
            setIsSyncing(true);
            try {
                // Hardcoded company_id for now. Should be dynamic.
                const { data: companies } = await supabase.from('companies').select('id').limit(1);
                if (!companies || companies.length === 0) {
                    throw new Error("Nenhuma empresa encontrada para sincronizar.");
                }
                const companyId = companies[0].id;

                const result = await nfeSync(companyId);
                toast({ title: 'Sincronização Concluída', description: result.message });
                fetchDocuments(); // Refresh list
            } catch (error) {
                toast({ variant: 'destructive', title: 'Erro na Sincronização', description: error.message });
            } finally {
                setIsSyncing(false);
            }
        };

        return (
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle>Documentos Fiscais Recebidos</CardTitle>
                            <CardDescription>Lista dos últimos documentos sincronizados da SEFAZ.</CardDescription>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm"><Filter className="mr-2 h-4 w-4" /> Filtrar</Button>
                            <Button onClick={handleSync} disabled={isSyncing} size="sm">
                                {isSyncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                                Sincronizar Agora
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Data Emissão</TableHead>
                                <TableHead>Chave NFe</TableHead>
                                <TableHead>Emitente</TableHead>
                                <TableHead>Schema</TableHead>
                                <TableHead className="text-right">Valor</TableHead>
                                <TableHead>Situação</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={6} className="text-center"><Loader2 className="mx-auto animate-spin" /></TableCell></TableRow>
                            ) : documents.length === 0 ? (
                                <TableRow><TableCell colSpan={6} className="text-center">Nenhum documento encontrado.</TableCell></TableRow>
                            ) : (
                                documents.map(doc => (
                                    <TableRow key={doc.id}>
                                        <TableCell>{doc.dhemi ? format(new Date(doc.dhemi), 'dd/MM/yyyy HH:mm') : 'N/A'}</TableCell>
                                        <TableCell className="font-mono text-xs">{doc.chnfe}</TableCell>
                                        <TableCell>{doc.emit_cnpj}</TableCell>
                                        <TableCell>{doc.schema}</TableCell>
                                        <TableCell className="text-right">{doc.vnf ? formatCurrencyBR(doc.vnf) : 'N/A'}</TableCell>
                                        <TableCell>{doc.cstat}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        );
    };

    export default NFeRecebidas;