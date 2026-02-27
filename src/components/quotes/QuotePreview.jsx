import React from 'react';
import ReactMarkdown from 'react-markdown';
import { format } from 'date-fns';

function QuotePreview({ quote, company, client, vendedor, autor }) {
  const formatCurrency = (value) => (value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  
  const productItems = quote.items?.filter(item => item.tipo_item === 'PRODUTO') || [];
  const serviceItems = quote.items?.filter(item => item.tipo_item === 'SERVICO') || [];

  const subtotalProdutos = productItems.reduce((acc, item) => acc + (item.valor_total_item || 0), 0);
  const subtotalServicos = serviceItems.reduce((acc, item) => acc + (item.valor_total_item || 0), 0);

  const renderProductRow = (item, index) => (
    <tr key={`prod-${index}`} className="border-b border-gray-200">
      <td className="p-1 align-top">{item.codigo}</td>
      <td className="p-1 align-top">{item.descricao}</td>
      <td className="p-1 align-top text-center">{Number(item.qtde).toFixed(3)}</td>
      <td className="p-1 align-top text-center">{item.ncm}</td>
      <td className="p-1 align-top text-right">{Number(item.preco_bruto_c_ipi).toLocaleString('pt-BR', { minimumFractionDigits: 4 })}</td>
      <td className="p-1 align-top text-center">{Number(item.aliq_ipi).toFixed(2)}%</td>
      <td className="p-1 align-top text-right font-semibold">{formatCurrency(item.valor_total_item)}</td>
      <td className="p-1 align-top text-center">{item.prazo_embarque_dias} dias</td>
    </tr>
  );

  const renderServiceRow = (item, index) => {
    const isScmService = item.subtipo_servico === 'INTERNET/TELECOM (SCM)' || item.subtipo_servico === 'PLANO_COMBO';
    return (
      <tr key={`serv-${index}`} className="border-b border-gray-200">
        <td className="p-1 align-top">{item.codigo}</td>
        <td className="p-1 align-top">{item.descricao}</td>
        <td className="p-1 align-top text-center">{Number(item.qtde).toFixed(3)}</td>
        <td className="p-1 align-top text-right">{formatCurrency(item.preco_base)}</td>
        <td className="p-1 align-top text-center">{Number(isScmService ? item.aliq_icms_com : item.aliq_iss).toFixed(2)}%</td>
        <td className="p-1 align-top text-right font-semibold">{formatCurrency(item.valor_total_item)}</td>
        <td className="p-1 align-top text-center">{item.prazo_embarque_dias} dias</td>
      </tr>
    );
  };
    
  return (
    <div className="quote-preview p-6 bg-white text-gray-800 font-sans text-xs shadow-lg max-h-[80vh] overflow-y-auto scrollbar-hide">
      
      <header className="flex justify-between items-start pb-4 border-b-2 border-gray-300">
        <div className="w-1/2">
          {company?.logoUrl && <img-replace src={company.logoUrl} alt={`${company.name} Logo`} className="h-16 object-contain object-left mb-2" />}
          <h2 className="font-bold text-base">{company?.name}</h2>
          <p>{company?.address}</p>
          <p>CNPJ: {company?.cnpj}</p>
        </div>
        <div className="text-right">
          <h1 className="text-lg font-bold text-gray-900">PROPOSTA COMERCIAL</h1>
          <p>Número: <span className="font-semibold">{quote.proposta_numero}</span></p>
          <p>Revisão: <span className="font-semibold">{quote.revisao}</span></p>
          <p>Validade: <span className="font-semibold">{quote.validade_proposta ? format(new Date(quote.validade_proposta), 'dd/MM/yyyy') : 'N/A'}</span></p>
        </div>
      </header>
      
      <section className="mt-4">
        <div className="grid grid-cols-2 gap-4">
          <div><p><span className="font-bold">Cliente:</span> {client?.nome_razao}</p></div>
          <div><p><span className="font-bold">Finalidade:</span> {quote.finalidade}</p></div>
          <div><p><span className="font-bold">CNPJ/CPF:</span> {client?.cpf_cnpj}</p></div>
          <div><p><span className="font-bold">Contribuinte ICMS:</span> {quote.contribuinte_icms ? 'Sim' : 'Não'}</p></div>
          {client?.addresses?.[0] && <div><p><span className="font-bold">Endereço:</span> {`${client.addresses[0].logradouro}, ${client.addresses[0].numero}`}</p></div>}
        </div>
      </section>

      {productItems.length > 0 && (
        <section className="mt-4">
          <h3 className="font-bold text-teal-600 mb-2">Produtos</h3>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-100 border-b-2 border-gray-300">
                <th className="p-1 w-[8%]">CÓDIGO</th>
                <th className="p-1 w-[28%]">PRODUTO</th>
                <th className="p-1 w-[6%] text-center">QTDE</th>
                <th className="p-1 w-[7%] text-center">NCM</th>
                <th className="p-1 w-[9%] text-right">PREÇO BRUTO</th>
                <th className="p-1 w-[6%] text-center">IPI %</th>
                <th className="p-1 w-[11%] text-right">VALOR TOTAL</th>
                <th className="p-1 w-[5%] text-center">PRAZO</th>
              </tr>
            </thead>
            <tbody>{productItems.map(renderProductRow)}</tbody>
          </table>
        </section>
      )}

      {serviceItems.length > 0 && (
        <section className="mt-4">
          <h3 className="font-bold text-indigo-600 mb-2">Serviços</h3>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-100 border-b-2 border-gray-300">
                <th className="p-1 w-[10%]">CÓDIGO</th>
                <th className="p-1 w-[45%]">SERVIÇO</th>
                <th className="p-1 w-[8%] text-center">QTDE</th>
                <th className="p-1 w-[12%] text-right">PREÇO UNIT.</th>
                <th className="p-1 w-[8%] text-center">ICMS/ISS %</th>
                <th className="p-1 w-[12%] text-right">VALOR TOTAL</th>
                <th className="p-1 w-[5%] text-center">PRAZO</th>
              </tr>
            </thead>
            <tbody>{serviceItems.map(renderServiceRow)}</tbody>
          </table>
        </section>
      )}

      <section className="mt-4 flex justify-end">
        <div className="w-1/2">
          {subtotalProdutos > 0 && <div className="flex justify-between"><p>Subtotal Produtos:</p><p>{formatCurrency(subtotalProdutos)}</p></div>}
          {subtotalServicos > 0 && <div className="flex justify-between"><p>Subtotal Serviços:</p><p>{formatCurrency(subtotalServicos)}</p></div>}
          <div className="flex justify-between text-orange-600"><p>Total Tributos (est.):</p><p>{formatCurrency(quote.total_tributos_estimados)}</p></div>
          <div className="flex justify-between font-bold text-base border-t border-gray-400 mt-1 pt-1">
            <span>Total Geral:</span>
            <span>{formatCurrency(quote.total_geral)}</span>
          </div>
        </div>
      </section>

      {vendedor && vendedor.pessoa && (
          <section className="mt-4">
            <h3 className="font-bold border-b border-gray-300 mb-1">VENDEDOR</h3>
            <p><span className="font-bold">{vendedor.pessoa.nome_razao}</span></p>
            {vendedor.pessoa.email && <p>Email: {vendedor.pessoa.email}</p>}
            {vendedor.pessoa.telefone && <p>Tel: {vendedor.pessoa.telefone}</p>}
          </section>
      )}

      <section className="mt-4">
        <h3 className="font-bold border-b border-gray-300 mb-1">INFORMAÇÕES COMERCIAIS</h3>
        <div className="grid grid-cols-2 gap-x-4">
            <p><span className="font-bold">Cond. Pagamento:</span> {quote.condicao_pagamento}</p>
            <p><span className="font-bold">Frete:</span> {quote.frete}</p>
            <p><span className="font-bold">Local de Entrega:</span> {quote.local_entrega}</p>
        </div>
      </section>

      {quote.condicoes_gerais && (
          <section className="mt-4">
            <h3 className="font-bold border-b border-gray-300 mb-1">CONDIÇÕES GERAIS</h3>
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown>{quote.condicoes_gerais}</ReactMarkdown>
            </div>
          </section>
      )}
      
      <footer className="mt-8 pt-4 border-t-2 border-gray-300">
        <p className="text-gray-500 text-xs">
            Emitido por {autor?.nome_razao} em {format(new Date(), "dd/MM/yyyy 'às' HH:mm:ss")}
        </p>
        <p className="text-gray-500 text-center text-[10px] mt-4">Tributos estimados conforme parametrização BR/UF/Município vigente nesta data.</p>
      </footer>

    </div>
  );
}

export default QuotePreview;