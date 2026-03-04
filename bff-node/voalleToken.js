// bff-node/voalleToken.js
let cachedToken = null;
let tokenExpiresAt = 0;

export async function getVoalleToken() {
  const now = Date.now();
  if (cachedToken && now < tokenExpiresAt) return cachedToken;

  const authUrl = process.env.VOALLE_AUTH_URL;
  if (!authUrl) throw new Error("VOALLE_AUTH_URL não configurado (verifique seu .env)");

  const body = new URLSearchParams({
    grant_type: process.env.VOALLE_GRANT_TYPE || "client_credentials",
    scope: process.env.VOALLE_SCOPE || "syngw",
    client_id: process.env.VOALLE_CLIENT_ID || "",
    client_secret: process.env.VOALLE_CLIENT_SECRET || "",
    syndata: process.env.VOALLE_SYNDATA || ""
  });

  const resp = await fetch(authUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });

  const text = await resp.text();
  if (!resp.ok) throw new Error(`Falha ao obter token Voalle (${resp.status}): ${text}`);

  const data = JSON.parse(text);
  cachedToken = data.access_token;

  const expiresInSec = Number(data.expires_in || 300);
  tokenExpiresAt = Date.now() + Math.max(0, (expiresInSec - 30)) * 1000;

  return cachedToken;
}