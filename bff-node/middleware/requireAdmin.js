// bff-node/middleware/requireAdmin.js
import jwt from "jsonwebtoken";
import { db } from "../db.js";

export function requireAdmin(req, res, next) {
  try {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
    if (!token) return res.status(401).json({ error: "Não autorizado" });

    const secret = process.env.JWT_SECRET || "dev_secret_change_me";
    const payload = jwt.verify(token, secret);

    // ✅ atalho: admin seed do projeto (auth.js)
    if (payload?.email === "admin@ondamais.ai") {
      req.user = payload;
      return next();
    }

    // ✅ valida pelo banco (auth_users.role === 'admin')
    const userId = payload?.sub || payload?.id || payload?.userId;
    if (!userId) return res.status(403).json({ error: "Acesso negado (sem userId no token)" });

    const row = db.prepare(`SELECT id, role, is_active FROM auth_users WHERE id=?`).get(userId);
    if (!row) return res.status(403).json({ error: "Acesso negado (usuário não encontrado)" });
    if (Number(row.is_active || 0) !== 1) return res.status(403).json({ error: "Acesso negado (usuário inativo)" });

    if (row.role !== "admin") return res.status(403).json({ error: "Acesso negado (somente ADMIN)" });

    req.user = payload;
    return next();
  } catch (e) {
    return res.status(401).json({ error: "Token inválido ou expirado" });
  }
}