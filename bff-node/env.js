// bff-node/env.js
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ .env fica em voalle_front/.env (um nível acima do bff-node)
const envPath = path.join(__dirname, "..", ".env");
dotenv.config({ path: envPath });

// (opcional) log rápido só pra confirmar que carregou
// console.log("[ENV] carregado de:", envPath);