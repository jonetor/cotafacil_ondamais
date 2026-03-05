import { soapPost } from "./soap.js";
import { FISCAL_CUFAUTOR, FISCAL_TPAMB } from "./config.js";

export function buildNfeDistSoap({ cnpjDigits, lastNsu }) {
  const ultNSU = String(lastNsu).padStart(15, "0");

  const payload = `
<nfeDistDFeInteresse xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeDistribuicaoDFe">
  <nfeDadosMsg xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.01">
    <distDFeInt>
      <tpAmb>${FISCAL_TPAMB}</tpAmb>
      <cUFAutor>${FISCAL_CUFAUTOR}</cUFAutor>
      <CNPJ>${cnpjDigits}</CNPJ>
      <distNSU>
        <ultNSU>${ultNSU}</ultNSU>
      </distNSU>
    </distDFeInt>
  </nfeDadosMsg>
</nfeDistDFeInteresse>`.trim();

  const xml = `
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    ${payload}
  </soap:Body>
</soap:Envelope>`.trim();

  const soapAction = `"http://www.portalfiscal.inf.br/nfe/wsdl/NFeDistribuicaoDFe/nfeDistDFeInteresse"`;
  return { xml, soapAction };
}

export async function callNfeDist({ url, cnpjDigits, lastNsu }) {
  const { xml, soapAction } = buildNfeDistSoap({ cnpjDigits, lastNsu });
  return soapPost({ url, soapAction, xml });
}