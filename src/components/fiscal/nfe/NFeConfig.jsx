import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { Loader2, Save, Upload, FileCheck, AlertTriangle, ShieldCheck, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format, differenceInDays } from 'date-fns';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

const ufs = [
    { cod: 12, sigla: 'AC' }, { cod: 27, sigla: 'AL' }, { cod: 16, sigla: 'AP' }, { cod: 13, sigla: 'AM' },
    { cod: 29, sigla: 'BA' }, { cod: 23, sigla: 'CE' }, { cod: 53, sigla: 'DF' }, { cod: 32, sigla: 'ES' },
    { cod: 52, sigla: 'GO' }, { cod: 21, sigla: 'MA' }, { cod: 51, sigla: 'MT' }, { cod: 50, sigla: 'MS' },
    { cod: 31, sigla: 'MG' }, { cod: 15, sigla: 'PA' }, { cod: 25, sigla: 'PB' }, { cod: 41, sigla: 'PR' },
    { cod: 26, sigla: 'PE' }, { cod: 22, sigla: 'PI' }, { cod: 33, sigla: 'RJ' }, { cod: 24, sigla: 'RN' },
    { cod: 43, sigla: 'RS' }, { cod: 11, sigla: 'RO' }, { cod: 14, sigla: 'RR' }, { cod: 42, sigla: 'SC' },
    { cod: 35, sigla: 'SP' }, { cod: 28, sigla: 'SE' }, { cod: 17, sigla: 'TO' }
];

const CertStatusCard = ({ cert, onTest, onDeactivate, isTesting, isDeactivating }) => {
    if (!cert) return null;

    const daysUntilExpiry = differenceInDays(new Date(cert.not_after), new Date());
    const expiryVariant = daysUntilExpiry <= 0 ? 'destructive' : daysUntilExpiry < 30 ? 'warning' : 'default';

    return (
        <Card className="mt-6 bg-secondary/50">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <ShieldCheck className="text-green-500" /> Certificado Ativo
                </CardTitle>
                <CardDescription>Este é o certificado usado para o ambiente selecionado.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
                <p><strong>CNPJ:</strong> {cert.subject_cnpj}</p>
                <p><strong>Serial:</strong> {cert.serial}</p>
                <p><strong>Emissor:</strong> {cert.issuer}</p>
                <div className="flex items-center gap-2">
                    <strong>Validade:</strong>
                    <Badge variant={expiryVariant}>
                        {daysUntilExpiry <= 0 ? 'Expirado' : `Expira em ${daysUntilExpiry} dias`} ({format(new Date(cert.not_after), 'dd/MM/yyyy')})
                    </Badge>
                </div>
                <div className="flex gap-4 pt-4">
                    <Button onClick={onTest} disabled={isTesting}>
                        {isTesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Testar Conexão
                    </Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" disabled={isDeactivating}>
                                {isDeactivating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                                Desativar
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Esta ação irá desativar o certificado para este ambiente. Você precisará carregar um novo certificado para continuar as operações de NF-e.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={onDeactivate}>Confirmar</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </CardContent>
        </Card>
    );
};

const NFeConfig = ({ companyId }) => {
    const { toast } = useToast();
    const [activeCert, setActiveCert] = useState(null);
    const [pfxFile, setPfxFile] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [isDeactivating, setIsDeactivating] = useState(false);
    const { register, handleSubmit, setValue, watch, reset, getValues, formState: { errors } } = useForm({
        defaultValues: { env: '2', cuf: '', password: '' }
    });

    const env = watch('env');
    const cUF = watch('cuf');

    useEffect(() => {
        const fetchActiveCert = async () => {
            if (!companyId || !env) return;
            setIsLoading(true);
            try {
                const { data, error } = await supabase
                    .from('nfe_certificates')
                    .select('*')
                    .eq('company_id', companyId)
                    .eq('env', env)
                    .eq('active', true)
                    .single();

                if (error && error.code !== 'PGRST116') { // Ignore 'no rows found'
                    throw error;
                }
                setActiveCert(data);
                setValue('cuf', data?.cuf || '');
            } catch (error) {
                toast({ variant: 'destructive', title: 'Erro ao buscar certificado', description: error.message });
            } finally {
                setIsLoading(false);
            }
        };
        fetchActiveCert();
    }, [companyId, env, toast, setValue]);

    const onSubmit = async (formData) => {
        if (!companyId || !pfxFile || !formData.password) {
            toast({ variant: 'destructive', title: 'Dados incompletos', description: 'Selecione um arquivo PFX e informe a senha.' });
            return;
        }
        setIsSaving(true);

        const multipartForm = new FormData();
        multipartForm.append('company_id', companyId);
        multipartForm.append('env', env);
        multipartForm.append('cUF', cUF);
        multipartForm.append('pfx', pfxFile);
        multipartForm.append('password', formData.password);

        try {
            const { data, error } = await supabase.functions.invoke('nfe-cert-upload', { body: multipartForm });
            if (error) throw error;
            if (data.error) throw new Error(data.error);

            toast({ title: 'Certificado salvo com sucesso!' });
            setActiveCert(data);
            setPfxFile(null);
            reset({ ...getValues(), password: '' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro ao salvar certificado', description: error.message });
        } finally {
            setIsSaving(false);
        }
    };

    const handleTestConnection = async () => {
        setIsTesting(true);
        try {
            const { data, error } = await supabase.functions.invoke('nfe-cert-test', {
                body: JSON.stringify({ company_id: companyId, env })
            });
            if (error) throw error;
            if (data.error) throw new Error(data.error);

            toast({
                title: `Teste de Conexão: ${data.cStat}`,
                description: data.xMotivo,
                variant: data.cStat === '107' ? 'default' : 'destructive'
            });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Falha no teste', description: error.message });
        } finally {
            setIsTesting(false);
        }
    };
    
    const handleDeactivate = async () => {
        if (!activeCert) return;
        setIsDeactivating(true);
        const { error } = await supabase.from('nfe_certificates').update({ active: false }).eq('id', activeCert.id);
        if (error) {
            toast({ variant: 'destructive', title: 'Erro ao desativar', description: error.message });
        } else {
            toast({ title: 'Certificado desativado.' });
            setActiveCert(null);
        }
        setIsDeactivating(false);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Configuração de Certificado Digital</CardTitle>
                <CardDescription>Gerencie o certificado A1 para emissão e consulta de documentos fiscais.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="env">Ambiente</Label>
                            <Select onValueChange={(v) => setValue('env', v)} value={String(env)}>
                                <SelectTrigger id="env"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1">1 - Produção</SelectItem>
                                    <SelectItem value="2">2 - Homologação</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="cuf">UF (Sede da Empresa)</Label>
                            <Select onValueChange={(v) => setValue('cuf', v)} value={String(cUF || '')}>
                                <SelectTrigger id="cuf"><SelectValue placeholder="Selecione a UF" /></SelectTrigger>
                                <SelectContent>
                                    {ufs.map(uf => <SelectItem key={uf.cod} value={String(uf.cod)}>{uf.sigla} - {uf.cod}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {isLoading ? <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div> :
                        activeCert ? (
                            <CertStatusCard cert={activeCert} onTest={handleTestConnection} onDeactivate={handleDeactivate} isTesting={isTesting} isDeactivating={isDeactivating} />
                        ) : (
                            <Card className="mt-6 border-dashed border-amber-500 bg-amber-500/10">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-amber-500">
                                        <AlertTriangle /> Novo Certificado
                                    </CardTitle>
                                    <CardDescription>Nenhum certificado ativo para este ambiente. Faça o upload de um novo.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Arquivo do Certificado (.pfx)</Label>
                                        <div className="flex items-center gap-4">
                                            <Button type="button" variant="outline" onClick={() => document.getElementById('pfx-upload').click()}>
                                                <Upload className="mr-2 h-4 w-4" /> Carregar Arquivo
                                            </Button>
                                            <input id="pfx-upload" type="file" accept=".pfx" className="hidden" onChange={(e) => setPfxFile(e.target.files[0])} />
                                            {pfxFile && <div className="flex items-center gap-2 text-sm text-muted-foreground"><FileCheck className="h-5 w-5 text-green-500" /> <span>{pfxFile.name}</span></div>}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="password">Senha do Certificado</Label>
                                        <Input id="password" type="password" {...register('password', { required: 'A senha é obrigatória' })} />
                                        {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
                                    </div>
                                    <div className="flex justify-end pt-4">
                                        <Button type="submit" disabled={isSaving || !pfxFile}>
                                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                            Validar & Salvar
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    }
                </form>
            </CardContent>
        </Card>
    );
};

export default NFeConfig;