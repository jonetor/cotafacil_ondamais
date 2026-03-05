// bff-node/fiscal/cteDist.js
import { soapPost } from "./soap.js";
import { FISCAL_CUFAUTOR, FISCAL_TPAMB } from "./config.js";

/**
 * WS: CTeDistribuicaoDFe
 * Método: cteDistDFeInteresse (NT 2015.002) :contentReference[oaicite:1]{index=1}
 *
 * Consulta por:
 * - distNSU (ultNSU)
 * - consNSU (NSU específico) (opcional — podemos implementar depois)
 */
export function buildCteDistSoap({ cnpjDigits, lastNsu }) {
  const ultNSU = String(lastNsu).padStart(15, "0");

  // Layout baseado no distDFeInt (NT 2015.002) :contentReference[oaicite:2]{index=2}
  const payload = `
<cteDistDFeInteresse xmlns="http://www.portalfiscal.inf.br/cte/wsdl/CTeDistribuicaoDFe">
  <cteDadosMsg xmlns="http://www.portalfiscal.inf.br/cte" versao="1.00">
    <distDFeInt versao="1.00">
      <tpAmb>${FISCAL_TPAMB}</tpAmb>
      <cUFAutor>${FISCAL_CUFAUTOR}</cUFAutor>
      <CNPJ>${cnpjDigits}</CNPJ>
      <distNSU>
        <ultNSU>${ultNSU}</ultNSU>
      </distNSU>
    </distDFeInt>
  </cteDadosMsg>
</cteDistDFeInteresse>`.trim();

  const xml = `
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    ${payload}
  </soap:Body>
</soap:Envelope>`.trim();

  // SOAPAction segue o padrão Portal Fiscal (mesmo estilo do NF-e).
  const soapAction = `"http://www.portalfiscal.inf.br/cte/wsdl/CTeDistribuicaoDFe/cteDistDFeInteresse"`;

  return { xml, soapAction };
}

export async function callCteDist({ url, cnpjDigits, lastNsu }) {
  const { xml, soapAction } = buildCteDistSoap({ cnpjDigits, lastNsu });
  return soapPost({ url, soapAction, xml });
}