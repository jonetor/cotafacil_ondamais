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

function getUserById(id) {
  return db
    .prepare(
      `SELECT id, email, name, role, is_active, created_at
       FROM users
       WHERE id = ?`
    )
    .get(String(id));
}

function getUserByEmail(email) {
  return db
    .prepare(
      `SELECT id, email, name, password_hash, role, is_active, created_at
       FROM users
       WHERE email = ?`
    )
    .get(norm(email));
}

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

    const user = getUserByEmail(email);
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

// ✅ GET /api/auth/me  (AGORA: devolve do banco)
router.get("/me", requireAuth, (req, res) => {
  try {
    const id = String(req.user.sub);
    const row = getUserById(id);

    // se não achou, devolve o payload do token como fallback
    if (!row) return res.json({ ok: true, user: req.user });

    return res.json({
      ok: true,
      user: {
        id: row.id,
        email: row.email,
        name: row.name,
        role: row.role,
        is_active: row.is_active,
        created_at: row.created_at,
      },
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

// ✅ PUT /api/auth/me  (salvar nome/email do usuário logado)
router.put("/me", requireAuth, (req, res) => {
  try {
    const id = String(req.user.sub);

    const name = String(req.body?.name || "").trim();
    const email = norm(req.body?.email || "");

    if (!name) return res.status(400).json({ ok: false, error: "Nome é obrigatório" });
    if (!email || !email.includes("@")) {
      return res.status(400).json({ ok: false, error: "Email inválido" });
    }

    const current = db
      .prepare(`SELECT id, email, name, role, is_active FROM users WHERE id = ?`)
      .get(id);

    if (!current) return res.status(404).json({ ok: false, error: "Usuário não encontrado" });
    if (current.is_active !== 1) return res.status(403).json({ ok: false, error: "Usuário inativo" });

    const other = db
      .prepare(`SELECT id FROM users WHERE email = ? AND id <> ?`)
      .get(email, id);

    if (other) return res.status(409).json({ ok: false, error: "E-mail já cadastrado" });

    db.prepare(`UPDATE users SET name = ?, email = ? WHERE id = ?`).run(name, email, id);

    const updated = db
      .prepare(`SELECT id, email, name, role, is_active, created_at FROM users WHERE id = ?`)
      .get(id);

    // ✅ gera novo token pra refletir nome/email atualizados
    const token = signToken(updated);

    return res.json({
      ok: true,
      token,
      user: {
        id: updated.id,
        email: updated.email,
        name: updated.name,
        role: updated.role,
        is_active: updated.is_active,
        created_at: updated.created_at,
      },
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

// ✅ POST /api/auth/change-password  (trocar senha do usuário logado)
router.post("/change-password", requireAuth, (req, res) => {
  try {
    const id = String(req.user.sub);
    const currentPassword = String(req.body?.currentPassword || "");
    const newPassword = String(req.body?.newPassword || "");

    if (!currentPassword) {
      return res.status(400).json({ ok: false, error: "Senha atual obrigatória" });
    }
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ ok: false, error: "Nova senha deve ter pelo menos 6 caracteres" });
    }

    const row = db
      .prepare(`SELECT id, password_hash, is_active FROM users WHERE id = ?`)
      .get(id);

    if (!row) return res.status(404).json({ ok: false, error: "Usuário não encontrado" });
    if (row.is_active !== 1) return res.status(403).json({ ok: false, error: "Usuário inativo" });

    const ok = bcrypt.compareSync(currentPassword, row.password_hash);
    if (!ok) return res.status(401).json({ ok: false, error: "Senha atual incorreta" });

    const newHash = bcrypt.hashSync(newPassword, 10);
    db.prepare(`UPDATE users SET password_hash = ? WHERE id = ?`).run(newHash, id);

    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

// GET /api/auth/sellers
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

// POST /api/auth/users  (admin cria user)
router.post("/users", requireAuth, requireAdmin, (req, res) => {
  try {
    const email = norm(req.body?.email || "");
    const name = String(req.body?.name || "").trim();
    const password = String(req.body?.password || "");
    const role = String(req.body?.role || "seller").trim() || "seller";

    if (!email || !name || !password) {
      return res.status(400).json({ ok: false, error: "email, name e password são obrigatórios" });
    }
    if (!["seller", "admin"].includes(role)) {
      return res.status(400).json({ ok: false, error: "role inválida (use 'seller' ou 'admin')" });
    }

    const exists = db.prepare(`SELECT id FROM users WHERE email = ?`).get(email);
    if (exists) return res.status(409).json({ ok: false, error: "E-mail já cadastrado" });

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

// POST /api/auth/create-seller  (compat endpoint antigo)
router.post("/create-seller", requireAuth, requireAdmin, (req, res) => {
  try {
    const email = norm(req.body?.email || "");
    const name = String(req.body?.name || "").trim();
    const password = String(req.body?.password || "");

    if (!email || !name || !password) {
      return res.status(400).json({ ok: false, error: "email, name e password são obrigatórios" });
    }

    const exists = db.prepare(`SELECT id FROM users WHERE email = ?`).get(email);
    if (exists) return res.status(409).json({ ok: false, error: "E-mail já cadastrado" });

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

export default router;