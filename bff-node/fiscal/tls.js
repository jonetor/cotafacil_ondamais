// bff-node/fiscal/tls.js
import fs from "node:fs";
import https from "node:https";
import { A1_PFX_PATH, A1_PFX_PASSWORD } from "./config.js";

export function makeHttpsAgent() {
  // sem A1: agent normal (não vai funcionar para SEFAZ, mas evita crash)
  if (!A1_PFX_PATH || !A1_PFX_PASSWORD || !fs.existsSync(A1_PFX_PATH)) {
    return new https.Agent({ keepAlive: true, rejectUnauthorized: true });
  }

  const pfx = fs.readFileSync(A1_PFX_PATH);
  return new https.Agent({
    pfx,
    passphrase: A1_PFX_PASSWORD,
    keepAlive: true,
    rejectUnauthorized: true
  });
}