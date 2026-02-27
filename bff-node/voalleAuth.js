// bff-node/voalleAuth.js
let cachedToken = null;
let tokenExpiresAt = 0;

export async function getVoalleToken() {
  const now = Date.now();
  if (cachedToken && now < tokenExpiresAt) return cachedToken;

  const authUrl = process.env.VOALLE_AUTH_URL;
  const clientId = process.env.VOALLE_CLIENT_ID;
  const clientSecret = process.env.VOALLE_CLIENT_SECRET;
  const syndata = process.env.VOALLE_SYNDATA;

  // ✅ ajuda muito a debugar
  const missing = [];
  if (!authUrl) missing.push("VOALLE_AUTH_URL");
  if (!clientId) missing.push("VOALLE_CLIENT_ID");
  if (!clientSecret) missing.push("VOALLE_CLIENT_SECRET");
  if (!syndata) missing.push("VOALLE_SYNDATA");
  if (missing.length) {
    throw new Error(`Config Voalle ausente no .env: ${missing.join(", ")}`);
  }

  const body = new URLSearchParams({
    grant_type: process.env.VOALLE_GRANT_TYPE || "client_credentials",
    scope: process.env.VOALLE_SCOPE || "syngw",
    client_id: clientId,
    client_secret: clientSecret,
    syndata,
  });

  const resp = await fetch(authUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const text = await resp.text();
  if (!resp.ok) {
    throw new Error(`Falha ao obter token Voalle (${resp.status}): ${text}`);
  }

  const data = JSON.parse(text);
  cachedToken = data.access_token;

  const expiresInSec = Number(data.expires_in || 300);
  tokenExpiresAt = Date.now() + Math.max(0, (expiresInSec - 30)) * 1000;

  return cachedToken;
}