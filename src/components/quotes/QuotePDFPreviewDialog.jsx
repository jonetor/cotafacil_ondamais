import React from 'react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileDown, X } from 'lucide-react';
import { cnpjMask, cpfMask, phoneMask } from '@/lib/masks';

const formatCurrency = (value) => (Number(value) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const safeText = (text) => text || '';

const renderRow = (item, type) => {
    let taxLabel = '';
    let taxValue = 0;

    if (type === 'product') {
        taxLabel = 'ICMS %';
        taxValue = item.aliq_icms;
    } else if (type === 'scm') {
        taxLabel = 'ICMS %';
        taxValue = item.aliq_icms_com;
    } else {
        taxLabel = 'ISSQN %';
        taxValue = item.aliq_iss;
    }

    return (
        <tr key={item.uid} className="border-b border-gray-200 text-xs">
            <td className="p-1 align-top">{safeText(item.codigo)}</td>
            <td className="p-1 align-top">{safeText(item.descricao)}</td>
            <td className="p-1 align-top text-center">{Number(item.qtde || 0).toFixed(3)}</td>
            <td className="p-1 align-top text-right">{formatCurrency(item.preco_base)}</td>
            <td className="p-1 align-top text-center">{Number(taxValue || 0).toFixed(2)}%</td>
            <td className="p-1 align-top text-right font-semibold">{formatCurrency(item.valor_total_item)}</td>
            <td className="p-1 align-top text-center">{safeText(item.prazo_embarque_dias)} dias</td>
        </tr>
    );
};

const QuotePDFPreviewDialog = ({ isOpen, onClose, onConfirm, previewData }) => {
    if (!isOpen || !previewData?.quote || !previewData?.company || !previewData?.client) {
        return null;
    }

    const { quote, company, client, vendedor } = previewData;
    const companyAddress = company.addresses?.[0] || {};
    const clientAddress = client.addresses?.[0] || {};

    const productItems = quote.items?.filter(item => item.tipo_item === 'PRODUTO') || [];
    const serviceItems = quote.items?.filter(item => item.tipo_item === 'SERVICO' && item.subtipo_servico !== 'INTERNET/TELECOM (SCM)') || [];
    const scmServiceItems = quote.items?.filter(item => item.tipo_item === 'SERVICO' && item.subtipo_servico === 'INTERNET/TELECOM (SCM)') || [];
    
    const validade = quote.validity_days ? new Date() : null;
    if (validade) validade.setDate(new Date().getDate() + Number(quote.validity_days));
    const proposalDate = validade ? format(validade, 'dd/MM/yyyy') : '';
    
    const getTaxInfo = (items, type) => {
        const totalTributosFederais = items.reduce((acc, item) => acc + (item.total_tributos_federais_item || 0), 0);
        const totalTributosEstaduais = items.reduce((acc, item) => acc + (item.total_tributos_estaduais_item || 0), 0);
        const totalTributosMunicipais = items.reduce((acc, item) => acc + (item.total_tributos_municipais_item || 0), 0);
        
        if (type === 'product') {
            return (
                <>
                    <p>Tributos Estaduais (ICMS): {formatCurrency(totalTributosEstaduais)}</p>
                    <p>Tributos Federais (PIS/COFINS/IPI): {formatCurrency(totalTributosFederais)}</p>
                </>
            );
        }
        if (type === 'service') {
            return (
                <>
                    <p>Tributos Municipais (ISSQN): {formatCurrency(totalTributosMunicipais)}</p>
                    <p>Tributos Federais (PIS/COFINS): {formatCurrency(totalTributosFederais)}</p>
                </>
            );
        }
        if (type === 'scm') {
            return (
                <>
                    <p>Tributos Estaduais (ICMS): {formatCurrency(totalTributosEstaduais)}</p>
                    <p>Tributos Federais (PIS/COFINS): {formatCurrency(totalTributosFederais)}</p>
                </>
            );
        }
        return null;
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="glass-effect border-white/20 text-white max-w-5xl p-0">
                <DialogHeader className="p-6 pb-0">
                    <DialogTitle className="text-white flex justify-between items-center">
                        Pré-visualização da Proposta
                        <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4"/></Button>
                    </DialogTitle>
                </DialogHeader>

                <div className="p-6 max-h-[75vh] overflow-y-auto">
                    <div className="bg-white text-gray-800 font-sans shadow-lg p-8">
                        <header className="flex justify-between items-start pb-4 border-b-2 border-gray-300">
                            <div className="w-1/3">
                                {company?.headerImageUrl && <img src={company.headerImageUrl} alt="Logo da Empresa" className="max-w-full h-auto object-contain" />}
                            </div>
                            <div className="w-1/3 text-center">
                                <p className="text-lg font-bold">COMERCIAL</p>
                            </div>
                            <div className="w-1/3 text-right text-xs">
                                <p><span className="font-bold">Proposta:</span> {safeText(quote.proposta_numero)}</p>
                                <p><span className="font-bold">Revisão:</span> {safeText(quote.revisao)}</p>
                                <p><span className="font-bold">Validade:</span> {proposalDate}</p>
                            </div>
                        </header>

                        <h1 className="text-xl font-bold text-gray-900 text-right my-4">PROPOSTA</h1>
                        
                        <section className="grid grid-cols-2 gap-x-6 mb-6 text-xs">
                            <div className="border p-2 rounded">
                                <h2 className="font-bold text-sm mb-1">Fornecedor</h2>
                                <p>{safeText(company.name)}</p>
                                <p>CNPJ: {cnpjMask(company.cnpj)}</p>
                                <p>IE: {safeText(company.ie)}</p>
                                <p>Endereço: {`${safeText(companyAddress.logradouro)}, ${safeText(companyAddress.numero)} - ${safeText(companyAddress.bairro)}`}</p>
                                <p>Email: {safeText(company.email)} | Tel: {phoneMask(company.phone)}</p>
                            </div>
                            <div className="border p-2 rounded">
                                <h2 className="font-bold text-sm mb-1">Cliente</h2>
                                <p>{safeText(client.nome_razao)}</p>
                                <p>CNPJ/CPF: {client.tipo_pessoa === 'PF' ? cpfMask(client.cpf_cnpj) : cnpjMask(client.cpf_cnpj)}</p>
                                <p>Endereço: {`${safeText(clientAddress.logradouro)}, ${safeText(clientAddress.numero)} - ${safeText(clientAddress.bairro)}`}</p>
                                <p>Email: {safeText(client.email)} | Tel: {phoneMask(client.telefone)}</p>
                                {quote.contactPerson && <p>Aos Cuidados: {safeText(quote.contactPerson)}</p>}
                            </div>
                        </section>

                        {[
                            { title: 'Produtos', items: productItems, type: 'product', subtotal: quote.subtotal_produtos },
                            { title: 'Serviços', items: serviceItems, type: 'service', subtotal: quote.subtotal_servicos },
                            { title: 'Serviços SCM', items: scmServiceItems, type: 'scm', subtotal: quote.subtotal_scm }
                        ].map(section => section.items.length > 0 && (
                            <section key={section.title} className="mt-4">
                                <h3 className="font-bold text-sm mb-1 bg-gray-200 px-2 py-1">{section.title}</h3>
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-gray-800 text-white text-xs">
                                            <th className="p-1 w-[8%]">CÓDIGO</th><th className="p-1 w-[37%]">DESCRIÇÃO</th><th className="p-1 w-[8%] text-center">QTDE</th>
                                            <th className="p-1 w-[12%] text-right">PREÇO UNIT.</th><th className="p-1 w-[10%] text-center">{section.type === 'service' ? 'ISSQN %' : 'ICMS %'}</th>
                                            <th className="p-1 w-[15%] text-right">VALOR TOTAL</th><th className="p-1 w-[10%] text-center">PRAZO</th>
                                        </tr>
                                    </thead>
                                    <tbody>{section.items.map(item => renderRow(item, section.type))}</tbody>
                                </table>
                                <div className="text-right mt-1 pt-1 border-t border-gray-300">
                                    <div className="text-xs text-gray-600">{getTaxInfo(section.items, section.type)}</div>
                                    <p className="font-bold text-sm mt-1">Subtotal {section.title}: {formatCurrency(section.subtotal)}</p>
                                </div>
                            </section>
                        ))}

                        <section className="mt-6 flex justify-end">
                            <div className="w-1/2 space-y-1 text-sm">
                                <div className="flex justify-between font-bold text-base border-t border-gray-400 mt-2 pt-2">
                                    <span>Total Geral:</span><span>{formatCurrency(quote.total_geral)}</span>
                                </div>
                                <div className="text-xs text-gray-500 mt-2 text-right">
                                    <p>Valor Total Aproximado dos Tributos Federais: {formatCurrency(quote.total_tributos_federais)}</p>
                                    <p>Valor Total Aproximado dos Tributos Estaduais/Municipais: {formatCurrency(quote.total_tributos_estaduais + quote.total_tributos_municipais)}</p>
                                </div>
                            </div>
                        </section>

                        <section className="mt-6 text-xs">
                            <h3 className="font-bold text-sm mb-1">INFORMAÇÕES COMERCIAIS</h3>
                            <p><span className="font-bold">Cond. Pagamento:</span> {safeText(quote.payment_terms)}</p>
                            <p><span className="font-bold">Frete:</span> {safeText(quote.freight_type)}</p>
                            <p><span className="font-bold">Local de Entrega:</span> {safeText(quote.delivery_location)}</p>
                        </section>

                        {vendedor && (
                          <section className="mt-2 text-xs">
                              <h3 className="font-bold text-sm mb-1">VENDEDOR</h3>
                              <p>{safeText(vendedor?.name)} | Email: {safeText(vendedor?.email)} | Tel: {phoneMask(vendedor?.telefone)}</p>
                          </section>
                        )}

                        {quote.notes && (
                            <section className="mt-2 text-xs">
                                <h3 className="font-bold text-sm mb-1">CONDIÇÕES GERAIS</h3>
                                <p className="whitespace-pre-wrap">{safeText(quote.notes)}</p>
                            </section>
                        )}
                        
                        <footer className="mt-8 pt-4 border-t-2 border-gray-300 text-xs">
                            {company?.footerImageUrl && <img src={company.footerImageUrl} alt="Rodapé da Empresa" className="w-full h-auto object-contain my-4" />}
                        </footer>
                    </div>
                </div>

                <DialogFooter className="p-6 pt-0">
                    <Button variant="outline" onClick={onClose}>Fechar</Button>
                    <Button onClick={onConfirm} className="btn-primary">
                        <FileDown className="w-4 h-4 mr-2" />
                        Baixar PDF
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default QuotePDFPreviewDialog;