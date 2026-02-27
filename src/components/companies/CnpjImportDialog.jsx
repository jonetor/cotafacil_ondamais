import React, { useState, useRef } from 'react';
import { DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, FileUp } from 'lucide-react';
import { CnpjExtractor } from '@/lib/cnpjExtractor';

function CnpjImportDialog({ onDataExtracted, onCancel }) {
    const [isParsing, setIsParsing] = useState(false);
    const { toast } = useToast();
    const fileInputRef = useRef(null);

    const handleFileChange = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        if (file.type !== 'application/pdf' || file.size > 5 * 1024 * 1024) {
            toast({
                variant: 'destructive',
                title: 'Arquivo Inválido',
                description: 'Por favor, selecione um arquivo PDF com no máximo 5MB.',
            });
            return;
        }

        setIsParsing(true);
        try {
            const extractor = new CnpjExtractor();
            const data = await extractor.parse(file);
            
            const companyData = {
                name: data.razao_social,
                fantasia: data.fantasia,
                cnpj: data.cnpj,
                data_abertura: data.data_abertura,
                natureza_juridica: data.natureza_juridica,
                situacao_cadastral: data.situacao_cadastral,
                data_situacao: data.data_situacao,
                cnae_principal_codigo: data.cnae_principal_codigo,
                cnae_principal_desc: data.cnae_principal_desc,
                cnae_secundarios: data.cnae_secundarias || [],
            };

            const addressData = {
                logradouro: data.logradouro,
                numero: data.numero,
                complemento: data.complemento,
                bairro: data.bairro,
                cidade: data.municipio,
                uf: data.uf,
                cep: data.cep?.replace(/\D/g, ''),
                tipo_endereco: 'PRINCIPAL',
            };

            const contactData = {
                email: data.email,
                phone: data.phone,
            };

            toast({
                title: "PDF importado com sucesso!",
                description: `Dados da empresa ${data.razao_social} extraídos do arquivo.`,
            });

            onDataExtracted({ companyData, addressData, contactData });

        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Erro ao processar PDF',
                description: error.message || 'Não foi possível extrair os dados do arquivo.',
            });
        } finally {
            setIsParsing(false);
            if(fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <DialogContent className="glass-effect border-slate-700 text-slate-200 max-w-md">
            <DialogHeader>
                <DialogTitle className="text-slate-100 flex items-center">
                    <FileUp className="w-5 h-5 mr-2 text-blue-400" />
                    Importar Cartão CNPJ
                </DialogTitle>
                <DialogDescription className="text-slate-400 pt-2">
                    Selecione um arquivo PDF do Cartão CNPJ para preencher os dados automaticamente.
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
                <div>
                    <input
                        type="file"
                        accept="application/pdf"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                        id="pdf-upload"
                    />
                    <Button 
                        onClick={() => fileInputRef.current?.click()} 
                        disabled={isParsing} 
                        variant="outline" 
                        className="w-full btn-secondary h-24 border-dashed"
                    >
                        {isParsing ? <Loader2 className="w-6 h-6 mr-2 animate-spin" /> : <FileUp className="w-6 h-6 mr-2" />}
                        {isParsing ? 'Processando...' : 'Selecionar Arquivo PDF'}
                    </Button>
                </div>
            </div>
            <DialogFooter className="pt-4">
                <Button variant="ghost" onClick={onCancel}>Fechar</Button>
            </DialogFooter>
        </DialogContent>
    );
}

export default CnpjImportDialog;