import React, { useState, useMemo, useCallback, useEffect } from 'react';
    import { motion } from 'framer-motion';
    import { Upload, FileText, BarChart2, Calculator, Save, AlertTriangle, CheckCircle, FileDown, Trash2, Info } from 'lucide-react';
    import { useToast } from '@/components/ui/use-toast';
    import { Button } from '@/components/ui/button';
    import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
    import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
    import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
    import { Badge } from '@/components/ui/badge';
    import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
    import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
    import { formatCurrencyBR } from '@/lib/utils';
    import { supabase } from '@/lib/customSupabaseClient';
    import { utils, write } from 'xlsx';
    import jsPDF from 'jspdf';
    import 'jspdf-autotable';

    const estados = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"];
    const CST_SEM_CREDITO = ['20', '30', '40', '41', '50', '51', '60', '70', '80', '81', '90'];
    const CST_ST = ['10', '30', '60', '70'];

    function CalculoEntradaNF({ onDataParsed = () => {} }) {
      const [notasFiscais, setNotasFiscais] = useState([]);
      const [ufDestino, setUfDestino] = useState('PA');
      const [loading, setLoading] = useState(false);
      const [ufConfigs, setUfConfigs] = useState({});
      const { toast } = useToast();

      useEffect(() => {
        const fetchUfConfigs = async () => {
          setLoading(true);
          try {
            const { data, error } = await supabase.from('fisc_uf_config').select('*');
            if (error) {
              throw error;
            }
            const configs = data.reduce((acc, config) => {
              acc[config.uf] = config;
              return acc;
            }, {});
            setUfConfigs(configs);
          } catch (error) {
            console.error("Erro ao buscar configurações de UF:", error);
            toast({ variant: "destructive", title: "Erro de Configuração", description: "Não foi possível carregar as regras fiscais dos estados." });
          } finally {
            setLoading(false);
          }
        };
        fetchUfConfigs();
      }, []);
      
      const calcularItens = useCallback((itens, uf, configUf) => {
        if (!configUf) {
            toast({ variant: "destructive", title: "Configuração não encontrada", description: `Não há regra de cálculo para a UF ${uf}.` });
            return itens.map(item => ({ ...item, difal: 0, creditoICMS: parseFloat(item.vICMS) || 0, isCreditoPermitido: true }));
        }

        return itens.map(item => {
            const vBC = parseFloat(item.vBC) || 0;
            const pICMSOrigem = parseFloat(item.pICMS) || 0;
            const vICMS = parseFloat(item.vICMS) || 0;

            const isCreditoPermitido = !CST_SEM_CREDITO.includes(item.cst);
            const creditoICMS = isCreditoPermitido ? vICMS : 0;
            
            let difal = 0;
            const aliquotaDestino = configUf.aliquota_interna;
            
            if (configUf.metodo_calculo_difal === 'duplo') {
                // Cálculo por dentro (base dupla)
                const baseAjustada = vBC / (1 - (aliquotaDestino / 100));
                const icmsDestino = baseAjustada * (aliquotaDestino / 100);
                const icmsOrigem = baseAjustada * (pICMSOrigem / 100);
                difal = icmsDestino - icmsOrigem;
            } else {
                // Cálculo por fora (base simples)
                difal = vBC * ((aliquotaDestino - pICMSOrigem) / 100);
            }

            difal = Math.max(0, difal);

            return {
                ...item,
                vICMS: vICMS,
                creditoICMS,
                difal,
                fcp: 0, // FCP não está no escopo atual
                isCreditoPermitido,
                isST: CST_ST.includes(item.cst),
                metodoCalculo: configUf.metodo_calculo_difal,
                isPaRule: uf === 'PA'
            };
        });
      }, [toast]);

      const processXml = async (xmlText, file) => {
        setLoading(true);
        try {
          const xmlBase64 = btoa(unescape(encodeURIComponent(xmlText)));
          const { data, error } = await supabase.functions.invoke('fiscal-xml-parse', {
            body: { xmlBase64 },
          });

          if (error) throw error;
          if (!data || !data.capa || !data.itens) {
            throw new Error("Resposta da API inválida. Faltando 'capa' ou 'itens'.");
          }

          const { capa, itens } = data;

          if (notasFiscais.some(n => n.chNFe === capa.chNFe)) {
            toast({ variant: "destructive", title: "Nota já carregada", description: "Esta nota fiscal já foi adicionada à lista." });
            setLoading(false);
            return;
          }

          const configUf = ufConfigs[capa.destUF];
          setUfDestino(capa.destUF);
          const itensCalculados = calcularItens(itens, capa.destUF, configUf);

          const novaNota = {
            ...capa,
            xml: xmlText,
            fileName: file.name,
            itens: itensCalculados,
          };

          setNotasFiscais(prev => [...prev, novaNota]);
          onDataParsed(prev => [...(prev || []), ...itensCalculados]);

          toast({ title: "Nota Fiscal Processada", description: `A nota ${capa.chNFe} foi carregada com sucesso.` });

        } catch (error) {
          console.error("Erro ao processar XML:", error);
          toast({ variant: "destructive", title: "Erro ao Processar XML", description: error.message || "Ocorreu um erro desconhecido." });
        } finally {
          setLoading(false);
        }
      };
      
      const handleFileChange = (event) => {
        const files = Array.from(event.target.files);
        if (files.length === 0) return;

        files.forEach(file => {
          const reader = new FileReader();
          reader.onload = (e) => processXml(e.target.result, file);
          reader.onerror = (err) => {
            console.error("FileReader Error: ", err);
            toast({ variant: "destructive", title: "Erro de Leitura", description: "Não foi possível ler o arquivo." });
          };
          reader.readAsText(file);
        });
        event.target.value = '';
      };

      const handleUfDestinoChange = useCallback((newUf) => {
        setUfDestino(newUf);
        const configUf = ufConfigs[newUf];
        if (!configUf) {
            toast({ variant: "destructive", title: "Regra não encontrada", description: `Não há regra de cálculo para a UF ${newUf}. O DIFAL será zerado.` });
        }
        setNotasFiscais(prevNotas => prevNotas.map(nota => ({
          ...nota,
          itens: calcularItens(nota.itens, newUf, configUf)
        })));
      }, [ufConfigs, calcularItens, toast]);

      const removerNota = (chNFe) => {
        const notaRemovida = notasFiscais.find(n => n.chNFe === chNFe);
        setNotasFiscais(prev => prev.filter(n => n.chNFe !== chNFe));
        if (notaRemovida) {
          onDataParsed(prev => (prev || []).filter(item => item.chNFe !== chNFe));
        }
        toast({ title: "Nota Removida", description: "A nota fiscal e seus itens foram removidos da lista." });
      };

      const totaisConsolidados = useMemo(() => {
        return notasFiscais.reduce((acc, nota) => {
          nota.itens.forEach(item => {
            acc.baseCalculo += parseFloat(item.vBC) || 0;
            acc.creditoICMS += item.creditoICMS || 0;
            acc.difal += item.difal || 0;
            acc.vICMS += parseFloat(item.vICMS) || 0;
          });
          return acc;
        }, { baseCalculo: 0, creditoICMS: 0, difal: 0, vICMS: 0 });
      }, [notasFiscais]);
      
      const handleSave = async () => {
        // Funcionalidade de salvar mantida como no original, pode ser ajustada se necessário.
        toast({ title: "Funcionalidade em desenvolvimento", description: "O salvamento dos dados será implementado em breve!" });
      };
      
      const exportToXLSX = () => {
        if (notasFiscais.length === 0) return;
        const workbook = utils.book_new();
        notasFiscais.forEach(nota => {
          const dataToExport = nota.itens.map(item => ({
            'Item': item.nItem, 'Descrição': item.xProd, 'NCM': item.ncm, 'CST': item.cst, 'CFOP': item.cfop,
            'vBC': formatCurrencyBR(item.vBC), '% ICMS Orig.': `${parseFloat(item.pICMS || 0).toFixed(2)}%`,
            'vICMS Destacado': formatCurrencyBR(item.vICMS),
            'Crédito ICMS': formatCurrencyBR(item.creditoICMS), 'DIFAL': formatCurrencyBR(item.difal),
            'Método': item.metodoCalculo
          }));
          const worksheet = utils.json_to_sheet(dataToExport);
          utils.book_append_sheet(workbook, worksheet, `Nota ${nota.chNFe.substring(0, 10)}`);
        });

        const summaryData = [{
          'Descrição': 'Total Base de Cálculo', 'Valor': formatCurrencyBR(totaisConsolidados.baseCalculo)
        }, {
          'Descrição': 'Total vICMS Destacado', 'Valor': formatCurrencyBR(totaisConsolidados.vICMS)
        }, {
          'Descrição': 'Total Crédito ICMS', 'Valor': formatCurrencyBR(totaisConsolidados.creditoICMS)
        }, {
          'Descrição': 'Total DIFAL', 'Valor': formatCurrencyBR(totaisConsolidados.difal)
        }];
        const summarySheet = utils.json_to_sheet(summaryData, {skipHeader: true});
        utils.book_append_sheet(workbook, summarySheet, "Resumo Consolidado");

        const wbout = write(workbook, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([wbout], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'calculo_consolidado_entrada.xlsx';
        a.click();
        URL.revokeObjectURL(url);
      };

      const exportToPDF = () => {
        if (notasFiscais.length === 0) return;
        const doc = new jsPDF();
        doc.text('Relatório Consolidado de Cálculo de Entrada', 14, 16);
        let finalY = 25;

        notasFiscais.forEach((nota, index) => {
          if (index > 0) doc.addPage();
          finalY = 16;
          doc.setFontSize(12);
          doc.text(`Nota Fiscal: ${nota.chNFe}`, 14, finalY);
          finalY += 8;

          const notaTotals = nota.itens.reduce((acc, item) => {
            acc.creditoICMS += item.creditoICMS || 0;
            acc.difal += item.difal || 0;
            return acc;
          }, { creditoICMS: 0, difal: 0 });

          doc.autoTable({
            head: [['Item', 'vBC', 'Crédito ICMS', 'DIFAL']],
            body: nota.itens.map(item => [
              item.nItem, formatCurrencyBR(item.vBC), formatCurrencyBR(item.creditoICMS), formatCurrencyBR(item.difal)
            ]),
            startY: finalY,
            foot: [[
              'Total da Nota', '', formatCurrencyBR(notaTotals.creditoICMS), formatCurrencyBR(notaTotals.difal)
            ]],
            footStyles: { fontStyle: 'bold' },
          });
          finalY = doc.autoTable.previous.finalY + 10;
        });

        doc.addPage();
        doc.text('Resumo Consolidado Geral', 14, 16);
        doc.autoTable({
          startY: 25,
          head: [['Descrição', 'Valor Total']],
          body: [
            ['Total Base de Cálculo', formatCurrencyBR(totaisConsolidados.baseCalculo)],
            ['Total Crédito ICMS', formatCurrencyBR(totaisConsolidados.creditoICMS)],
            ['Total DIFAL', formatCurrencyBR(totaisConsolidados.difal)],
          ],
          theme: 'grid',
          headStyles: { fillColor: [22, 163, 74] },
        });

        doc.save('calculo_consolidado_entrada.pdf');
      };

      return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <Card className="bg-card/80 backdrop-blur-sm border-white/10">
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <div className="flex items-center">
                  <BarChart2 className="mr-2" />
                  Análise de Notas Fiscais de Entrada
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <label htmlFor="uf-destino" className="text-sm font-medium text-muted-foreground">UF de Destino:</label>
                    <Select value={ufDestino} onValueChange={handleUfDestinoChange}>
                      <SelectTrigger className="w-[80px] bg-background/50"><SelectValue placeholder="UF" /></SelectTrigger>
                      <SelectContent>{estados.map(uf => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleSave} disabled={loading || notasFiscais.length === 0}><Save className="mr-2 h-4 w-4" /> Salvar Análise</Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {notasFiscais.length === 0 ? (
                <div
                  className="border-2 border-dashed border-muted-foreground/50 rounded-lg p-12 text-center cursor-pointer hover:border-primary transition-colors"
                  onClick={() => document.getElementById('xml-upload').click()}
                >
                  <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                  <p className="mt-4 text-muted-foreground">Clique para selecionar os arquivos XML.</p>
                  <input type="file" id="xml-upload" accept=".xml" multiple className="hidden" onChange={handleFileChange} />
                  {loading && <p className="mt-4 text-primary animate-pulse">Processando...</p>}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">ICMS Destacado Total</CardTitle><Calculator className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{formatCurrencyBR(totaisConsolidados.vICMS)}</div></CardContent></Card>
                    <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Crédito ICMS Total</CardTitle><CheckCircle className="h-4 w-4 text-green-500" /></CardHeader><CardContent><div className="text-2xl font-bold text-green-500">{formatCurrencyBR(totaisConsolidados.creditoICMS)}</div></CardContent></Card>
                    <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">DIFAL Total</CardTitle><AlertTriangle className="h-4 w-4 text-yellow-500" /></CardHeader><CardContent><div className="text-2xl font-bold text-yellow-500">{formatCurrencyBR(totaisConsolidados.difal)}</div></CardContent></Card>
                  </div>

                  <div className="flex justify-between items-center mb-4">
                    <Button variant="outline" onClick={() => document.getElementById('xml-upload-extra').click()}><Upload className="mr-2 h-4 w-4" /> Adicionar mais notas</Button>
                    <input type="file" id="xml-upload-extra" accept=".xml" multiple className="hidden" onChange={handleFileChange} />
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={exportToXLSX}><FileDown className="mr-2 h-4 w-4" />Exportar XLSX</Button>
                      <Button variant="outline" onClick={exportToPDF}><FileDown className="mr-2 h-4 w-4" />Exportar PDF</Button>
                    </div>
                  </div>

                  <Accordion type="multiple" className="w-full" defaultValue={notasFiscais.map(n => n.chNFe)}>
                    {notasFiscais.map(nota => {
                      const totaisNota = nota.itens.reduce((acc, item) => {
                        acc.vICMS += parseFloat(item.vICMS) || 0;
                        acc.creditoICMS += item.creditoICMS || 0;
                        acc.difal += item.difal || 0;
                        return acc;
                      }, { vICMS: 0, creditoICMS: 0, difal: 0 });

                      return (
                        <AccordionItem value={nota.chNFe} key={nota.chNFe}>
                          <AccordionTrigger>
                            <div className="flex items-center justify-between w-full">
                              <div className="flex items-center gap-3">
                                <FileText className="h-5 w-5 text-primary" />
                                <div className="text-left">
                                  <p className="font-mono text-sm">{nota.chNFe}</p>
                                  <p className="text-xs text-muted-foreground">{nota.fileName}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <Badge variant="secondary">Crédito: {formatCurrencyBR(totaisNota.creditoICMS)}</Badge>
                                <Badge variant="destructive">DIFAL: {formatCurrencyBR(totaisNota.difal)}</Badge>
                                <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); removerNota(nota.chNFe); }} className="hover:bg-destructive/20">
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </div>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <Table>
                              <TableHeader><TableRow>
                                  <TableHead>Item</TableHead><TableHead>Descrição</TableHead>
                                  <TableHead className="text-right">vBC</TableHead>
                                  <TableHead className="text-center">% ICMS Orig.</TableHead>
                                  <TableHead className="text-right">vICMS</TableHead>
                                  <TableHead className="text-right">Crédito ICMS</TableHead>
                                  <TableHead className="text-right">DIFAL</TableHead>
                                  <TableHead className="text-center">Método</TableHead>
                              </TableRow></TableHeader>
                              <TableBody>
                                {nota.itens.map((item) => (
                                  <TableRow key={`${item.chNFe}-${item.nItem}`}>
                                    <TableCell>{item.nItem}</TableCell>
                                    <TableCell>{item.xProd}</TableCell>
                                    <TableCell className="text-right">{formatCurrencyBR(item.vBC)}</TableCell>
                                    <TableCell className="text-center">{`${parseFloat(item.pICMS || 0).toFixed(2)}%`}</TableCell>
                                    <TableCell className="text-right">{formatCurrencyBR(item.vICMS)}</TableCell>
                                    <TableCell className="text-right text-green-400">{formatCurrencyBR(item.creditoICMS)}</TableCell>
                                    <TableCell className="text-right text-yellow-400">{formatCurrencyBR(item.difal)}</TableCell>
                                    <TableCell className="text-center">
                                       <TooltipProvider>
                                          <Tooltip>
                                            <TooltipTrigger>
                                              <div className="flex items-center justify-center gap-1">
                                                <Badge variant={item.metodoCalculo === 'duplo' ? 'warning' : 'secondary'}>
                                                  {item.metodoCalculo}
                                                </Badge>
                                                {item.isPaRule && (
                                                  <Info className="h-4 w-4 text-blue-400" />
                                                )}
                                              </div>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                              <p>Método de cálculo: {item.metodoCalculo === 'duplo' ? 'Base Dupla (por dentro)' : 'Base Simples (por fora)'}.</p>
                                              {item.isPaRule && <p className="font-bold">Regra especial do Pará aplicada.</p>}
                                            </TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                              <TableFooter><TableRow>
                                  <TableCell colSpan={4}>Totais da Nota</TableCell>
                                  <TableCell className="text-right font-bold">{formatCurrencyBR(totaisNota.vICMS)}</TableCell>
                                  <TableCell className="text-right font-bold text-green-400">{formatCurrencyBR(totaisNota.creditoICMS)}</TableCell>
                                  <TableCell className="text-right font-bold text-yellow-400">{formatCurrencyBR(totaisNota.difal)}</TableCell>
                                  <TableCell></TableCell>
                              </TableRow></TableFooter>
                            </Table>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      );
    }

    export default CalculoEntradaNF;