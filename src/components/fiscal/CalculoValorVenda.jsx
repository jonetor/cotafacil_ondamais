import React, { useState, useEffect, useMemo, useCallback } from 'react';
    import { motion } from 'framer-motion';
    import { Input } from '@/components/ui/input';
    import { Button } from '@/components/ui/button';
    import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
    import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
    import { FileDown, UploadCloud, Loader2, BrainCircuit, DollarSign } from 'lucide-react';
    import { useToast } from "@/components/ui/use-toast";
    import { jsPDF } from "jspdf";
    import autoTable from 'jspdf-autotable';
    import * as XLSX from 'xlsx';
    import { formatCurrencyBR } from '@/lib/utils';
    import { supabase } from '@/lib/customSupabaseClient';

    const initialParams = {
        aliqICMSSaidaItem: 18,
        aliqPISItem: 0.65,
        aliqCOFINSItem: 3,
        despFixaItem: 10,
        margemItem: 25,
    };

    const CalculoValorVenda = () => {
      const { toast } = useToast();
      const [itensVenda, setItensVenda] = useState([]);
      const [isLoading, setIsLoading] = useState(false);
      const [uploadedFiles, setUploadedFiles] = useState([]);
      
      const calcularPrecoVenda = useCallback((item) => {
        const custoEntradaUnit = (item.vProd + (item.vIPI || 0) - (item.v_credito_icms || 0)) / item.qtd;
        const custoComDesp = custoEntradaUnit * (1 + (item.despFixaItem / 100));
        const precoLiquidoAlvo = custoComDesp * (1 + (item.margemItem / 100));
        const totalImpostosSaida = (item.aliqICMSSaidaItem / 100) + (item.aliqPISItem / 100) + (item.aliqCOFINSItem / 100);
        
        if (totalImpostosSaida >= 1) {
          return { ...item, custoEntradaUnit, custoComDesp, precoBrutoSugerido: Infinity };
        }

        const precoBruto = precoLiquidoAlvo / (1 - totalImpostosSaida);

        return {
          ...item,
          custoEntradaUnit,
          custoComDesp,
          precoBrutoSugerido: precoBruto,
          icmsSaida: precoBruto * (item.aliqICMSSaidaItem / 100),
          pisCofinsSaida: precoBruto * ((item.aliqPISItem + item.aliqCOFINSItem) / 100),
        };
      }, []);

      const processarCalculoEntrada = useCallback(async (parsedData) => {
        if (!parsedData || !parsedData.capa || !parsedData.itens) {
          throw new Error("Dados do XML inválidos após parsing.");
        }
        
        const { error: calcError, data: calcData } = await supabase.functions.invoke('fiscal-calculo-entrada', {
            body: JSON.stringify({
              destUF: parsedData.capa.destUF,
              itens: parsedData.itens.map(item => ({
                nItem: item.nItem,
                ncm: item.ncm,
                cst: item.cst,
                vBC: item.vBC,
                pICMS: item.pICMS,
                vICMS: item.vICMS,
                vBCSTRet: item.vBCSTRet,
                vICMSSTRet: item.vICMSSTRet,
                pFCP: item.pFCP,
                ICMSUFDest: item.ICMSUFDest
              }))
            })
          });

        if (calcError) {
          console.error('Erro ao chamar fiscal-calculo-entrada:', calcError);
          throw new Error(`Erro ao calcular impostos de entrada: ${calcError.message}`);
        }
        
        const itensComCalculo = parsedData.itens.map(itemOriginal => {
            const itemCalculado = calcData.itens.find(ic => ic.nItem === itemOriginal.nItem);
            return {
              ...itemOriginal,
              ...itemCalculado,
              chNFe: parsedData.capa.chNFe,
            };
        });

        return itensComCalculo;
      }, []);
      
      const handleFileUpload = async (event) => {
        const files = Array.from(event.target.files);
        if (files.length === 0) return;

        setIsLoading(true);
        setUploadedFiles(files.map(f => f.name));

        const processFile = async (file) => {
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = async (e) => {
              if (e.target.readyState !== FileReader.DONE) return;
              try {
                const xmlBase64 = e.target.result.split(',')[1];
                const { error: parseError, data: parsedDataWrapper } = await supabase.functions.invoke('fiscal-xml-parse', {
                  body: JSON.stringify({ xmlBase64 })
                });

                if (parseError || parsedDataWrapper.error) {
                  const error = parseError || new Error(parsedDataWrapper.error.message);
                  console.error('Erro no parse do XML:', error);
                  throw new Error(`Falha ao processar ${file.name}: ${error.message}`);
                }
                
                const parsedData = parsedDataWrapper.data;
                const itensComCalculoEntrada = await processarCalculoEntrada(parsedData);
                
                const novosItensVenda = itensComCalculoEntrada.map(item => {
                    const itemComParams = { ...item, ...initialParams };
                    return calcularPrecoVenda(itemComParams);
                });
                
                resolve(novosItensVenda);

              } catch (error) {
                console.error(`Erro ao processar arquivo ${file.name}:`, error);
                reject({ fileName: file.name, message: error.message });
              }
            };
            reader.readAsDataURL(file);
          });
        };
        
        try {
            const results = await Promise.all(files.map(processFile));
            const allNewItems = results.flat();
            setItensVenda(prev => [...prev, ...allNewItems].sort((a, b) => a.chNFe.localeCompare(b.chNFe) || a.nItem - b.nItem));

            toast({
              title: "Sucesso!",
              description: `${files.length} arquivo(s) XML processado(s) e adicionado(s) para cálculo.`,
            });
        } catch (error) {
             toast({
                variant: 'destructive',
                title: 'Erro ao processar um arquivo',
                description: error.message || `Ocorreu um erro com o arquivo ${error.fileName}.`,
            });
        } finally {
            setIsLoading(false);
            if (event.target) {
                event.target.value = '';
            }
        }
      };


      const handleParamChange = (nItem, chNFe, field, value) => {
        setItensVenda(prevItens =>
          prevItens.map(item => {
            if (item.nItem === nItem && item.chNFe === chNFe) {
              const updatedItem = { ...item, [field]: parseFloat(value) || 0 };
              return calcularPrecoVenda(updatedItem);
            }
            return item;
          })
        );
      };
      
      const handleExport = (format) => {
        if (itensVenda.length === 0) {
            toast({ variant: 'destructive', title: 'Nenhum dado para exportar!' });
            return;
        }

        const headers = ['Item', 'Descrição', 'Custo Unit.', 'Preço Sugerido', '% ICMS Saída', '% PIS', '% COFINS', '% Desp. Fixa', '% Margem'];
        const data = itensVenda.map(item => [
            item.nItem,
            item.xProd,
            formatCurrencyBR(item.custoEntradaUnit),
            formatCurrencyBR(item.precoBrutoSugerido),
            item.aliqICMSSaidaItem,
            item.aliqPISItem,
            item.aliqCOFINSItem,
            item.despFixaItem,
            item.margemItem,
        ]);

        if (format === 'xlsx') {
            const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Preco_de_Venda");
            XLSX.writeFile(wb, "calculo_preco_venda.xlsx");
        }

        if (format === 'pdf') {
            const doc = new jsPDF();
            doc.text("Cálculo de Preço de Venda", 14, 15);
            autoTable(doc, {
                head: [headers],
                body: data,
                startY: 20,
                theme: 'striped',
                headStyles: { fillColor: [41, 128, 185] },
            });
            doc.save("calculo_preco_venda.pdf");
        }

        toast({ title: 'Exportação Concluída!', description: `Arquivo ${format.toUpperCase()} gerado com sucesso.` });
      };

      const totaisEntrada = useMemo(() => {
        return itensVenda.reduce((acc, item) => {
            acc.creditoICMS += item.v_credito_icms || 0;
            acc.difal += item.v_difal || 0;
            acc.fcp += item.v_fcp || 0;
            return acc;
        }, { creditoICMS: 0, difal: 0, fcp: 0 });
      }, [itensVenda]);

      const UploadArea = () => (
         <Card className="mb-6 border-2 border-dashed border-muted-foreground/30 hover:border-primary transition-colors">
          <CardContent className="p-6 text-center">
            <label htmlFor="xml-upload-venda" className="cursor-pointer">
              <div className="flex flex-col items-center justify-center space-y-4">
                <UploadCloud className="h-12 w-12 text-primary" />
                <h3 className="text-xl font-semibold">Importar XML para Cálculo de Venda</h3>
                <p className="text-muted-foreground">Arraste e solte ou clique para carregar um ou mais arquivos XML de nota fiscal.</p>
                {isLoading && <p className="text-sm text-blue-500 animate-pulse">Carregando {uploadedFiles.join(', ')}...</p>}
              </div>
            </label>
            <Input id="xml-upload-venda" type="file" className="hidden" onChange={handleFileUpload} accept=".xml" multiple disabled={isLoading} />
          </CardContent>
        </Card>
      );

      return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <UploadArea />

            {isLoading && (
              <div className="flex justify-center items-center my-6">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-4 text-lg">Processando XMLs...</span>
              </div>
            )}
            
            {itensVenda.length === 0 && !isLoading && (
                <div className="flex flex-col items-center justify-center h-64 text-center p-8 bg-muted/10 rounded-lg border-2 border-dashed border-muted-foreground/30">
                    <BrainCircuit className="h-16 w-16 text-muted-foreground/50 mb-4" />
                    <p className="text-lg font-semibold text-foreground">Pronto para calcular seus preços.</p>
                    <p className="text-muted-foreground mt-2">Importe um ou mais arquivos XML para começar a mágica da precificação.</p>
                </div>
            )}

            {itensVenda.length > 0 && (
                <>
                <div className="grid gap-4 md:grid-cols-3 mb-6">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Crédito ICMS</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-green-500">{formatCurrencyBR(totaisEntrada.creditoICMS)}</div>
                        <p className="text-xs text-muted-foreground">Valor aproveitável da entrada</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total DIFAL a Pagar</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-orange-500">{formatCurrencyBR(totaisEntrada.difal)}</div>
                        <p className="text-xs text-muted-foreground">Diferencial de alíquota interestadual</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total FCP</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-red-500">{formatCurrencyBR(totaisEntrada.fcp)}</div>
                        <p className="text-xs text-muted-foreground">Fundo de Combate à Pobreza</p>
                      </CardContent>
                    </Card>
                </div>

                <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Formação do Preço de Venda</CardTitle>
                        <CardDescription>Ajuste os parâmetros para calcular o preço de venda sugerido.</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button onClick={() => handleExport('xlsx')} size="sm" variant="outline"><FileDown className="h-4 w-4 mr-2" />XLSX</Button>
                        <Button onClick={() => handleExport('pdf')} size="sm" variant="outline"><FileDown className="h-4 w-4 mr-2" />PDF</Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead className="w-[50px]">Item</TableHead>
                            <TableHead>Descrição</TableHead>
                            <TableHead className="text-right">Custo Unit.</TableHead>
                            <TableHead className="w-[120px] text-right">% ICMS Saída</TableHead>
                            <TableHead className="w-[120px] text-right">% PIS</TableHead>
                            <TableHead className="w-[120px] text-right">% COFINS</TableHead>
                            <TableHead className="w-[120px] text-right">% Desp. Fixa</TableHead>
                            <TableHead className="w-[120px] text-right">% Margem</TableHead>
                            <TableHead className="text-right">Preço Sugerido</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {itensVenda.map(item => (
                            <TableRow key={`${item.chNFe}-${item.nItem}`}>
                            <TableCell>{item.nItem}</TableCell>
                            <TableCell className="max-w-[250px] truncate" title={item.xProd}>{item.xProd}</TableCell>
                            <TableCell className="text-right">{formatCurrencyBR(item.custoEntradaUnit)}</TableCell>
                            <TableCell>
                                <Input type="number" step="0.01" value={item.aliqICMSSaidaItem} onChange={(e) => handleParamChange(item.nItem, item.chNFe, 'aliqICMSSaidaItem', e.target.value)} className="text-right h-8" />
                            </TableCell>
                            <TableCell>
                                <Input type="number" step="0.01" value={item.aliqPISItem} onChange={(e) => handleParamChange(item.nItem, item.chNFe, 'aliqPISItem', e.target.value)} className="text-right h-8" />
                            </TableCell>
                            <TableCell>
                                <Input type="number" step="0.01" value={item.aliqCOFINSItem} onChange={(e) => handleParamChange(item.nItem, item.chNFe, 'aliqCOFINSItem', e.target.value)} className="text-right h-8" />
                            </TableCell>
                            <TableCell>
                                <Input type="number" step="0.01" value={item.despFixaItem} onChange={(e) => handleParamChange(item.nItem, item.chNFe, 'despFixaItem', e.target.value)} className="text-right h-8" />
                            </TableCell>
                            <TableCell>
                                <Input type="number" step="0.01" value={item.margemItem} onChange={(e) => handleParamChange(item.nItem, item.chNFe, 'margemItem', e.target.value)} className="text-right h-8" />
                            </TableCell>
                            <TableCell className="text-right font-bold text-lg text-primary">{formatCurrencyBR(item.precoBrutoSugerido)}</TableCell>
                            </TableRow>
                        ))}
                        </TableBody>
                    </Table>
                    </div>
                </CardContent>
                </Card>
                </>
            )}
        </motion.div>
      );
    };

    export default CalculoValorVenda;