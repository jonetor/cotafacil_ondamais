// bff-node/fiscal/doczip.js
import zlib from "node:zlib";

/**
 * Recebe docZip em base64 (conteúdo do nó docZip) e devolve XML descompactado.
 */
export function decodeDocZip(docZipBase64) {
  const gz = Buffer.from(docZipBase64, "base64");
  return zlib.gunzipSync(gz).toString("utf-8");
}