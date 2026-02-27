import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url,
).toString();

export class CnpjExtractor {
    async sha256(buffer) {
        const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    cleanText(text) {
        return text.replace(/\s+/g, ' ').trim();
    }
    
    normalizeCnaeCode(code) {
        const cleaned = code.replace(/[^\d]/g, '');
        return cleaned.length === 7 ? cleaned : null;
    }

    async parse(file) {
        if (!file || file.type !== 'application/pdf') {
            throw new Error('Formato de arquivo inválido. Apenas PDF é suportado no momento.');
        }

        const fileBuffer = await file.arrayBuffer();
        const hash = await this.sha256(fileBuffer);

        const pdf = await pdfjsLib.getDocument({ data: fileBuffer }).promise;
        const numPages = pdf.numPages;
        let fullText = '';
        for (let i = 1; i <= numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            fullText += textContent.items.map(item => item.str).join(' ');
        }
        
        const cleanedText = this.cleanText(fullText);

        const extractedData = {
            originalFile: file,
            fileHash: hash,
            fonte_dados: "Cartão CNPJ – RFB"
        };
        
        const patterns = {
            cnpj: /(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/,
            razao_social: /NOME EMPRESARIAL\s*([A-Z\s&.-]+)\s*TÍTULO DO ESTABELECIMENTO/,
            fantasia: /TÍTULO DO ESTABELECIMENTO \(NOME DE FANTASIA\)\s*([A-Z\s.-]+)\s*CÓDIGO E DESCRIÇÃO DA ATIVIDADE/,
            porte: /PORTE\s*([A-Z\s]+)\s*CÓDIGO E DESCRIÇÃO DA NATUREZA JURÍDICA/,
            natureza_juridica: /CÓDIGO E DESCRIÇÃO DA NATUREZA JURÍDICA\s*(\d{4}-\d\s*-\s*[A-Z\s-]+)/,
            data_abertura: /DATA DE ABERTURA\s*(\d{2}\/\d{2}\/\d{4})/,
            logradouro: /LOGRADOURO\s*([A-Z\s.,\d]+)\s*NÚMERO/,
            numero: /NÚMERO\s*([\w\d-]+)\s*COMPLEMENTO/,
            complemento: /COMPLEMENTO\s*([A-Z\s\d.-]+)\s*CEP/,
            cep: /CEP\s*(\d{5}-\d{3})/,
            bairro: /BAIRRO\/DISTRITO\s*([A-Z\s.-]+)\s*MUNICÍPIO/,
            municipio: /MUNICÍPIO\s*([A-Z\s]+)\s*UF/,
            uf: /UF\s*([A-Z]{2})\s*ENDEREÇO ELETRÔNICO/,
            email: /ENDEREÇO ELETRÔNICO\s*([A-Z\d._%+-]+@[A-Z\d.-]+\.[A-Z]{2,})/i,
            phone: /TELEFONE\s*(\(\d{2}\)\s*\d{4,5}-\d{4})/,
            situacao_cadastral: /SITUAÇÃO CADASTRAL\s*([A-Z]+)\s*DATA DA SITUAÇÃO CADASTRAL/,
            data_situacao: /DATA DA SITUAÇÃO CADASTRAL\s*(\d{2}\/\d{2}\/\d{4})/,
            emitido_em: /EMITIDO EM (\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2})/
        };

        for (const [key, regex] of Object.entries(patterns)) {
            const match = cleanedText.match(regex);
            if (match && match[1]) {
                extractedData[key] = this.cleanText(match[1]);
            }
        }
        
        const cnaePrincipalRegex = /CÓDIGO E DESCRIÇÃO DA ATIVIDADE ECONÔMICA PRINCIPAL\s*([\d.-]+)\s*-\s*([A-Z\s\W,]+?)(?=CÓDIGO E DESCRIÇÃO DAS ATIVIDADES ECONÔMICAS SECUNDÁRIAS)/i;
        const cnaePrincipalMatch = cleanedText.match(cnaePrincipalRegex);
        if (cnaePrincipalMatch) {
            const codigo = this.normalizeCnaeCode(cnaePrincipalMatch[1]);
            if(codigo) {
                 extractedData.cnae_principal = {
                    codigo: codigo,
                    descricao: this.cleanText(cnaePrincipalMatch[2]),
                };
                extractedData.cnae_principal_codigo = codigo;
                extractedData.cnae_principal_desc = this.cleanText(cnaePrincipalMatch[2]);
            }
        }
        
        const cnaesSecundariasRegex = /CÓDIGO E DESCRIÇÃO DAS ATIVIDADES ECONÔMICAS SECUNDÁRIAS\s*([\s\S]+?)\s*SITUAÇÃO CADASTRAL/i;
        const cnaesSecundariasBlockMatch = cleanedText.match(cnaesSecundariasRegex);
        if (cnaesSecundariasBlockMatch) {
            const cnaesBlock = cnaesSecundariasBlockMatch[1];
            const cnaesRegex = /([\d.-]+)\s*-\s*([A-Z\s\W,]+?)(?=\d{2}\.\d{2}-\d-\d{2}|$)/gi;
            let match;
            extractedData.cnae_secundarias = [];
            while ((match = cnaesRegex.exec(cnaesBlock)) !== null) {
                const codigo = this.normalizeCnaeCode(match[1]);
                const descricao = this.cleanText(match[2]);
                if(codigo && descricao.length > 3) {
                     extractedData.cnae_secundarias.push({
                        codigo: codigo,
                        descricao: descricao,
                        selected: true,
                    });
                }
            }
             // Deduplicate
            const seen = new Set();
            extractedData.cnae_secundarias = extractedData.cnae_secundarias.filter(el => {
                const duplicate = seen.has(el.codigo);
                seen.add(el.codigo);
                return !duplicate;
            });
        }
        
        if(!extractedData.cnpj) {
            throw new Error('Não foi possível encontrar o CNPJ no documento. Verifique se o arquivo é um Cartão CNPJ válido.');
        }

        return extractedData;
    }
}