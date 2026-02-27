import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import { cnpjMask, cpfMask, phoneMask } from '@/lib/masks';

const safeText = (text) => text || '';
const formatCurrency = (value) => (Number(value) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const generateQuotePDF = ({ quote, company, client, vendedor, autor }) => {
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  const pageMargin = 14;
  const pageWidth = doc.internal.pageSize.width || doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
  let finalY = 0;

  const getImageDimensions = (base64) => {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve({ width: img.width, height: img.height });
        img.onerror = () => resolve({ width: 0, height: 0 });
        img.src = base64;
    });
  };

  const addHeader = async () => {
    finalY = pageMargin;
    doc.setFontSize(10);
    if (company?.headerImageUrl) {
        try {
            const dims = await getImageDimensions(company.headerImageUrl);
            if (dims.width > 0 && dims.height > 0) {
                const imgWidth = 60;
                const imgHeight = (dims.height * imgWidth) / dims.width;
                doc.addImage(company.headerImageUrl, 'PNG', pageMargin, finalY, imgWidth, imgHeight, undefined, 'FAST');
            }
        } catch (e) { console.error("Erro ao carregar o cabeçalho:", e); }
    }
    
    doc.setFont('helvetica', 'bold');
    doc.text('COMERCIAL', pageWidth / 2, finalY + 7, { align: 'center' });

    doc.setFontSize(8);
    const validade = quote.validity_days ? new Date() : null;
    if (validade) validade.setDate(new Date().getDate() + Number(quote.validity_days));
    const proposalDate = validade ? format(validade, 'dd/MM/yyyy') : '';
    
    let proposalInfoY = finalY;
    doc.setFont('helvetica', 'bold');
    doc.text(`Proposta:`, pageWidth - pageMargin - 25, proposalInfoY);
    doc.setFont('helvetica', 'normal');
    doc.text(`${safeText(quote.proposta_numero)}`, pageWidth - pageMargin, proposalInfoY, { align: 'right' });
    proposalInfoY += 4;
    
    doc.setFont('helvetica', 'bold');
    doc.text(`Revisão:`, pageWidth - pageMargin - 25, proposalInfoY);
    doc.setFont('helvetica', 'normal');
    doc.text(`${safeText(String(quote.revisao))}`, pageWidth - pageMargin, proposalInfoY, { align: 'right' });
    proposalInfoY += 4;

    doc.setFont('helvetica', 'bold');
    doc.text(`Validade:`, pageWidth - pageMargin - 25, proposalInfoY);
    doc.setFont('helvetica', 'normal');
    doc.text(`${proposalDate}`, pageWidth - pageMargin, proposalInfoY, { align: 'right' });

    finalY += 25;
    doc.setDrawColor(0, 0, 0);
    doc.line(pageMargin, finalY, pageWidth - pageMargin, finalY);
    finalY += 5;
  };

  const addFooter = async (pageNumber, totalPages) => {
    const footerStartY = pageHeight - 25;
    if (company?.footerImageUrl) {
      try {
        const dims = await getImageDimensions(company.footerImageUrl);
        if (dims.width > 0 && dims.height > 0) {
            const footerWidth = pageWidth;
            const footerHeight = (dims.height * footerWidth) / dims.width;
            doc.addImage(company.footerImageUrl, 'PNG', 0, pageHeight - footerHeight, footerWidth, footerHeight, undefined, 'FAST');
        }
      } catch (e) { console.error("Erro ao carregar o rodapé:", e); }
    }
    
    doc.setFontSize(8);
    doc.text(`Página ${pageNumber} de ${totalPages}`, pageWidth - pageMargin, pageHeight - 10, { align: 'right' });

    const emissionText = `Emitido por ${autor?.name || ''} em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm:ss")}`;
    doc.text(emissionText, pageMargin, pageHeight - 10);
  };
  
  const generate = async () => {
    await addHeader();

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('PROPOSTA', pageWidth - pageMargin, finalY, { align: 'right' });
    finalY += 10;
    
    // Supplier and Client Info
    const companyAddress = company.addresses?.[0] || {};
    const clientAddress = client.addresses?.[0] || {};
    const boxWidth = (pageWidth - (pageMargin * 2) - 5) / 2;

    doc.setFontSize(8);
    const fornecedorText = [
        { label: 'Fornecedor', value: safeText(company.name), isTitle: true },
        { label: 'CNPJ', value: cnpjMask(company.cnpj) },
        { label: 'IE', value: safeText(company.ie) },
        { label: 'Endereço', value: `${safeText(companyAddress.logradouro)}, ${safeText(companyAddress.numero)} - ${safeText(companyAddress.bairro)}` },
        { label: 'Email', value: safeText(company.email) },
        { label: 'Telefone', value: phoneMask(company.phone) },
    ];
    const clienteText = [
        { label: 'Cliente', value: safeText(client.nome_razao), isTitle: true },
        { label: 'CNPJ/CPF', value: client.tipo_pessoa === 'PF' ? cpfMask(client.cpf_cnpj) : cnpjMask(client.cpf_cnpj) },
        { label: 'Endereço', value: `${safeText(clientAddress.logradouro)}, ${safeText(clientAddress.numero)} - ${safeText(clientAddress.bairro)}` },
        { label: 'Email', value: safeText(client.email) },
        { label: 'Telefone', value: phoneMask(client.telefone) },
        { label: 'Aos Cuidados', value: safeText(quote.contactPerson) },
    ];

    const drawInfoBox = (lines, x, y, width) => {
        let currentY = y;
        lines.forEach(line => {
            if (line.isTitle) {
                doc.setFont('helvetica', 'bold');
                doc.text(line.label, x, currentY);
                currentY += 4;
                doc.setFont('helvetica', 'normal');
                doc.text(line.value, x, currentY);
            } else if (line.value) {
                doc.setFont('helvetica', 'bold');
                doc.text(`${line.label}:`, x, currentY);
                doc.setFont('helvetica', 'normal');
                const splitValue = doc.splitTextToSize(line.value, width - 20);
                doc.text(splitValue, x + 20, currentY);
                currentY += (splitValue.length * 3.5);
            }
            currentY += 1;
        });
        doc.rect(x - 2, y - 5, width, currentY - y + 2);
        return currentY;
    };

    const fornecedorY = drawInfoBox(fornecedorText, pageMargin + 2, finalY + 5, boxWidth);
    const clienteY = drawInfoBox(clienteText, pageMargin + boxWidth + 7, finalY + 5, boxWidth);
    finalY = Math.max(fornecedorY, clienteY) + 5;

    // Items Tables
    const currentItems = quote.items || [];
    const productItems = currentItems.filter(item => item.tipo_item === 'PRODUTO');
    const serviceItems = currentItems.filter(item => item.tipo_item === 'SERVICO' && item.subtipo_servico !== 'INTERNET/TELECOM (SCM)');
    const scmServiceItems = currentItems.filter(item => item.tipo_item === 'SERVICO' && item.subtipo_servico === 'INTERNET/TELECOM (SCM)');

    const drawTable = (title, items, columns, startY, taxInfo) => {
        if (items.length === 0) return startY;
        
        let tableY = startY;
        if (tableY + 30 > pageHeight - 30) { // Check if space for header + a few rows
            doc.addPage();
            tableY = pageMargin;
        }

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setFillColor(220, 220, 220);
        doc.rect(pageMargin, tableY - 4, pageWidth - (pageMargin * 2), 6, 'F');
        doc.text(title, pageMargin + 2, tableY);
        tableY += 6;

        const tableRows = items.map(item => columns.map(col => {
            let value = item[col.dataKey] ?? '';
             if (col.format === 'currency') value = formatCurrency(value);
             else if (col.format === 'decimal3') value = (Number(value) || 0).toFixed(3);
             else if (col.format === 'percent') value = `${(Number(value) || 0).toFixed(2)}%`;
             else if (col.format === 'days') value = `${value} dias`;
            return value;
        }));

        doc.autoTable({
            head: [columns.map(c => c.header)],
            body: tableRows,
            startY: tableY,
            margin: { left: pageMargin, right: pageMargin },
            styles: { fontSize: 7, cellPadding: 1.5, overflow: 'linebreak' },
            headStyles: { fillColor: [30, 30, 30], fontStyle: 'bold' },
            columnStyles: columns.reduce((acc, col) => {
                acc[col.dataKey] = { halign: col.halign, cellWidth: col.width ? col.width : 'auto' };
                if (col.fontStyle) acc[col.dataKey].fontStyle = col.fontStyle;
                return acc;
            }, {}),
            didDrawPage: (data) => {
                finalY = data.cursor.y;
            }
        });
        
        let currentY = doc.autoTable.previous.finalY;
        
        doc.setDrawColor(200, 200, 200);
        doc.line(pageMargin, currentY + 1, pageWidth - pageMargin, currentY + 1);
        currentY += 2;

        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        
        let taxY = currentY + 2;
        taxInfo.taxLines.forEach(line => {
            doc.text(line, pageWidth - pageMargin, taxY, { align: 'right' });
            taxY += 3.5;
        });
        
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text(`Subtotal ${title}:`, pageWidth - pageMargin - 40, taxY, { align: 'right' });
        doc.text(formatCurrency(taxInfo.subtotal), pageWidth - pageMargin, taxY, { align: 'right' });

        return taxY + 4;
    }
    
    const productColumns = [
        { header: 'CÓDIGO', dataKey: 'codigo', halign: 'left', width: 20 }, 
        { header: 'DESCRIÇÃO', dataKey: 'descricao', halign: 'left' }, 
        { header: 'QTDE', dataKey: 'qtde', format: 'decimal3', halign: 'center', width: 15 },
        { header: 'PREÇO UNIT.', dataKey: 'preco_base', format: 'currency', halign: 'right', width: 25 }, 
        { header: 'ICMS %', dataKey: 'aliq_icms', format: 'percent', halign: 'center', width: 15 },
        { header: 'VALOR TOTAL', dataKey: 'valor_total_item', format: 'currency', halign: 'right', fontStyle: 'bold', width: 30 }, 
        { header: 'PRAZO', dataKey: 'prazo_embarque_dias', format: 'days', halign: 'center', width: 15 },
    ];
    const serviceColumns = [...productColumns].map(c => c.dataKey === 'aliq_icms' ? {...c, header: 'ISSQN %', dataKey: 'aliq_iss'} : c);
    const scmServiceColumns = [...productColumns].map(c => c.dataKey === 'aliq_icms' ? {...c, dataKey: 'aliq_icms_com'} : c);

    const productTaxInfo = {
        taxLines: [
            `Tributos Estaduais (ICMS): ${formatCurrency(productItems.reduce((acc, i) => acc + (i.total_tributos_estaduais_item || 0), 0))}`,
            `Tributos Federais (PIS/COFINS/IPI): ${formatCurrency(productItems.reduce((acc, i) => acc + (i.total_tributos_federais_item || 0), 0))}`
        ],
        subtotal: quote.subtotal_produtos
    };
    const serviceTaxInfo = {
        taxLines: [
            `Tributos Municipais (ISSQN): ${formatCurrency(serviceItems.reduce((acc, i) => acc + (i.total_tributos_municipais_item || 0), 0))}`,
            `Tributos Federais (PIS/COFINS): ${formatCurrency(serviceItems.reduce((acc, i) => acc + (i.total_tributos_federais_item || 0), 0))}`
        ],
        subtotal: quote.subtotal_servicos
    };
    const scmTaxInfo = {
        taxLines: [
            `Tributos Estaduais (ICMS): ${formatCurrency(scmServiceItems.reduce((acc, i) => acc + (i.total_tributos_estaduais_item || 0), 0))}`,
            `Tributos Federais (PIS/COFINS): ${formatCurrency(scmServiceItems.reduce((acc, i) => acc + (i.total_tributos_federais_item || 0), 0))}`
        ],
        subtotal: quote.subtotal_scm
    };

    finalY = drawTable('Produtos', productItems, productColumns, finalY, productTaxInfo);
    finalY = drawTable('Serviços', serviceItems, serviceColumns, finalY, serviceTaxInfo);
    finalY = drawTable('Serviços SCM', scmServiceItems, scmServiceColumns, finalY, scmTaxInfo);
    
    if (finalY > pageHeight - 60) {
      doc.addPage();
      finalY = pageMargin;
    }

    // Totals
    let summaryY = finalY + 5;
    const summaryX = pageWidth - pageMargin;
    const summaryLabelX = summaryX - 40;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Geral:`, summaryLabelX, summaryY + 2, { align: 'right' });
    doc.text(formatCurrency(quote.total_geral), summaryX, summaryY + 2, { align: 'right' });
    summaryY += 6;

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(`Valor Total Aproximado dos Tributos Federais: ${formatCurrency(quote.total_tributos_federais)}`, summaryX, summaryY, { align: 'right' });
    summaryY += 3;
    doc.text(`Valor Total Aproximado dos Tributos Estaduais/Municipais: ${formatCurrency(quote.total_tributos_estaduais + quote.total_tributos_municipais)}`, summaryX, summaryY, { align: 'right' });
    
    finalY = summaryY + 10;

    // Sections
    const addSection = (title, content, startY) => {
        if(!content) return startY;
        let currentY = startY;
        if (currentY + 20 > pageHeight - 30) { doc.addPage(); currentY = pageMargin; }
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text(title, pageMargin, currentY);
        currentY += 4;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        const splitText = doc.splitTextToSize(safeText(content), pageWidth - (pageMargin * 2));
        const textHeight = splitText.length * 3.5;
        if (currentY + textHeight > pageHeight - 30) { doc.addPage(); currentY = pageMargin; }
        doc.text(splitText, pageMargin, currentY);
        return currentY + textHeight + 5;
    };
    
    const commercialInfo = `Cond. Pagamento: ${safeText(quote.payment_terms)} | Frete: ${safeText(quote.freight_type)} | Local de Entrega: ${safeText(quote.delivery_location)}`;
    finalY = addSection('INFORMAÇÕES COMERCIAIS', commercialInfo, finalY);
    
    if (vendedor) {
      const vendedorInfo = `${safeText(vendedor.name)}\nEmail: ${safeText(vendedor.email)}\nTelefone: ${phoneMask(vendedor.telefone)}`;
      finalY = addSection('VENDEDOR', vendedorInfo, finalY);
    }
    
    finalY = addSection('CONDIÇÕES GERAIS', quote.notes, finalY);
    
    // Finalize with headers and footers on all pages
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        if (i > 1) await addHeader();
        await addFooter(i, totalPages);
    }

    doc.save(`Proposta-${quote.proposta_numero}.pdf`);
  };

  generate();
};