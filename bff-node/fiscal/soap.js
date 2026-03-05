import axios from "axios";
import { makeHttpsAgent } from "./tls.js";

export async function soapPost({ url, soapAction, xml }) {
  const httpsAgent = makeHttpsAgent();
  const resp = await axios.post(url, xml, {
    httpsAgent,
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      SOAPAction: soapAction
    },
    timeout: 60000
  });
  return resp.data;
}