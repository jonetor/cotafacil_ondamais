import { FISCAL_MODE, hasA1, loadEndpoints } from "./config.js";

async function main() {
  if (FISCAL_MODE !== "online") {
    console.log("[CTE] FISCAL_MODE=offline. Sync SEFAZ desativado.");
    process.exit(0);
  }
  if (!hasA1()) {
    console.log("[CTE] Certificado A1 ausente. Configure A1_PFX_PATH/A1_PFX_PASSWORD. Sync SEFAZ desativado.");
    process.exit(0);
  }

  const endpoints = loadEndpoints();
  const cteUrl = endpoints?.cte?.distribution_dfe?.soap?.url;
  if (!cteUrl) throw new Error("URL CT-e não encontrada no webservice_endpoints.json");

  console.log("[CTE] Pronto para implementar (mesmo padrão do NF-e).");
  process.exit(0);
}
main();