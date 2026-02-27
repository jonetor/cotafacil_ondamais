// voalle_front/bff-node/api/auth.js
import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";

import { initDb, db, norm } from "../db.js";

const router = express.Router();

initDb();

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

// =========================
// Helpers
// =========================
function signToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    },
    JWT_SECRET,
    { expiresIn: "12h" }
  );
}

function getBearerToken(req) {
  const auth = req.headers.authorization || "";
  if (!auth.startsWith("Bearer ")) return null;
  return auth.slice("Bearer ".length).trim();
}

export function requireAuth(req, res, next) {
  const token = getBearerToken(req);
  if (!token) return res.status(401).json({ error: "Token ausente" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // {sub,email,role,name,iat,exp}
    return next();
  } catch (e) {
    return res.status(401).json({ error: "Token inválido/expirado" });
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Acesso negado (admin)" });
  }
  return next();
}

// ✅ compat: alguns módulos importam { authRequired } deste arquivo.
// Mantemos o nome antigo apontando para o mesmo middleware.
export const authRequired = requireAuth;

// =========================
// DB schema (auto)
// =========================
function ensureUsersTable() {
  db.prepare(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'seller',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    )
  `).run();

  db.prepare(`CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)`).run();
  db.prepare(`CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active)`).run();
}

function ensureAdminSeed() {
  // cria admin padrão se não existir
  const adminEmail = "admin@ondamais.ai";
  const adminPass = "102030";

  const exists = db.prepare(`SELECT id FROM users WHERE email = ?`).get(norm(adminEmail));
  if (exists) return;

  const id = crypto.randomUUID();
  const passHash = bcrypt.hashSync(String(adminPass), 10);

  db.prepare(`
    INSERT INTO users (id, email, name, password_hash, role, is_active, created_at)
    VALUES (?, ?, ?, ?, 'admin', 1, datetime('now'))
  `).run(id, norm(adminEmail), "Administrador", passHash);

  console.log("✅ Admin seed criado:", adminEmail, "/", adminPass);
}

ensureUsersTable();
ensureAdminSeed();

// =========================
// Routes
// =========================

// POST /api/auth/login
router.post("/login", (req, res) => {
  try {
    const email = norm(req.body?.email || "");
    const password = String(req.body?.password || "");

    if (!email || !password) {
      return res.status(400).json({ ok: false, error: "Email e senha são obrigatórios" });
    }

    const user = db
      .prepare(`SELECT id, email, name, password_hash, role, is_active FROM users WHERE email = ?`)
      .get(email);

    if (!user || user.is_active !== 1) {
      return res.status(401).json({ ok: false, error: "Credenciais inválidas" });
    }

    const ok = bcrypt.compareSync(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ ok: false, error: "Credenciais inválidas" });
    }

    const token = signToken(user);

    return res.json({
      ok: true,
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, error: "Erro interno no login" });
  }
});

// GET /api/auth/me
router.get("/me", requireAuth, (req, res) => {
  res.json({ ok: true, user: req.user });
});

router.get("/sellers", requireAuth, (req, res) => {
  // Se for vendedor, retorna só ele mesmo (para preencher o combo)
  if (req.user?.role === "seller") {
    return res.json({
      ok: true,
      items: [
        {
          id: req.user.sub,
          name: req.user.name,
          email: req.user.email,
          role: req.user.role,
          is_active: 1,
          created_at: null,
        },
      ],
    });
  }

  // Admin continua vendo todos os vendedores ativos
  const rows = db
    .prepare(
      `SELECT id, name, email, role, is_active, created_at
       FROM users
       WHERE role = 'seller' AND is_active = 1
       ORDER BY name ASC`
    )
    .all();

  res.json({ ok: true, items: rows });
});

// POST /api/auth/users
// Admin cria usuário (seller/admin)
router.post("/users", requireAuth, requireAdmin, (req, res) => {
  try {
    const email = norm(req.body?.email || "");
    const name = String(req.body?.name || "").trim();
    const password = String(req.body?.password || "");
    const role = String(req.body?.role || "seller").trim() || "seller";

    if (!email || !name || !password) {
      return res
        .status(400)
        .json({ ok: false, error: "email, name e password são obrigatórios" });
    }
    if (!["seller", "admin"].includes(role)) {
      return res
        .status(400)
        .json({ ok: false, error: "role inválida (use 'seller' ou 'admin')" });
    }

    const exists = db.prepare(`SELECT id FROM users WHERE email = ?`).get(email);
    if (exists) {
      return res.status(409).json({ ok: false, error: "E-mail já cadastrado" });
    }

    const id = crypto.randomUUID();
    const passHash = bcrypt.hashSync(password, 10);

    db.prepare(
      `INSERT INTO users (id, email, name, password_hash, role, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, 1, datetime('now'))`
    ).run(id, email, name, passHash, role);

    return res.json({ ok: true, user: { id, email, name, role, is_active: 1 } });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

// POST /api/auth/create-seller
// Compat: endpoint antigo esperado pelo front.
router.post("/create-seller", requireAuth, requireAdmin, (req, res) => {
  try {
    const body = req.body || {};
    req.body = { ...body, role: "seller" };
    // chama o mesmo handler de /users, sem duplicar lógica
    // (simplesmente executa a inserção novamente aqui)
    const email = norm(req.body?.email || "");
    const name = String(req.body?.name || "").trim();
    const password = String(req.body?.password || "");

    if (!email || !name || !password) {
      return res
        .status(400)
        .json({ ok: false, error: "email, name e password são obrigatórios" });
    }

    const exists = db.prepare(`SELECT id FROM users WHERE email = ?`).get(email);
    if (exists) {
      return res.status(409).json({ ok: false, error: "E-mail já cadastrado" });
    }

    const id = crypto.randomUUID();
    const passHash = bcrypt.hashSync(password, 10);
    db.prepare(
      `INSERT INTO users (id, email, name, password_hash, role, is_active, created_at)
       VALUES (?, ?, ?, ?, 'seller', 1, datetime('now'))`
    ).run(id, email, name, passHash);

    return res.json({ ok: true, user: { id, email, name, role: "seller", is_active: 1 } });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

// Exporta também os middlewares (útil para outros routers)
// (exports já declarados acima)

export default router;