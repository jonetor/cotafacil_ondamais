import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { db, norm } from "../db.js";

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "12h";
const REFRESH_GRACE_DAYS = Number(process.env.JWT_REFRESH_GRACE_DAYS || 7);

// =========================
// Helpers
// =========================
function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

function getBearerToken(req) {
  const auth = req.headers.authorization || "";
  if (!auth.startsWith("Bearer ")) return null;
  return auth.slice("Bearer ".length).trim();
}

export function requireAuth(req, res, next) {
  const token = getBearerToken(req);
  if (!token) return res.status(401).json({ ok: false, error: "Token ausente" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    return next();
  } catch {
    return res.status(401).json({ ok: false, error: "Token inválido/expirado" });
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ ok: false, error: "Acesso negado (admin)" });
  }
  return next();
}

export const authRequired = requireAuth;

// =========================
// DB helpers
// =========================
function getUserById(id) {
  return db
    .prepare(
      `SELECT id, email, name, role, is_active, created_at, updated_at
       FROM auth_users
       WHERE id = ?`
    )
    .get(String(id));
}

function getUserByEmail(email) {
  return db
    .prepare(
      `SELECT id, email, name, password_hash, role, is_active, created_at, updated_at
       FROM auth_users
       WHERE email = ?`
    )
    .get(norm(email));
}

// =========================
// Refresh
// =========================
router.post("/refresh", (req, res) => {
  const token = getBearerToken(req);
  if (!token) return res.status(401).json({ ok: false, error: "Token ausente" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = getUserById(decoded.sub);
    if (!user || user.is_active !== 1) {
      return res.status(401).json({ ok: false, error: "Sessão inválida" });
    }
    const newToken = signToken(user);
    return res.json({ ok: true, token: newToken });
  } catch {
    try {
      const decoded = jwt.decode(token);
      if (!decoded?.sub || !decoded?.exp) throw new Error("token inválido");

      const nowSec = Math.floor(Date.now() / 1000);
      const graceSec = REFRESH_GRACE_DAYS * 24 * 60 * 60;

      if (nowSec > decoded.exp + graceSec) {
        return res.status(401).json({ ok: false, error: "Token expirado (fora da janela de refresh)" });
      }

      const user = getUserById(decoded.sub);
      if (!user || user.is_active !== 1) {
        return res.status(401).json({ ok: false, error: "Sessão inválida" });
      }

      const newToken = signToken(user);
      return res.json({ ok: true, token: newToken });
    } catch {
      return res.status(401).json({ ok: false, error: "Token inválido/expirado" });
    }
  }
});

// =========================
// Register
// =========================
router.post("/register", (req, res) => {
  try {
    const email = norm(req.body?.email || "");
    const password = String(req.body?.password || "");
    const name = String(req.body?.name || "").trim();

    if (!email || !password || !name) {
      return res.status(400).json({ ok: false, error: "Nome, email e senha são obrigatórios" });
    }

    const exists = getUserByEmail(email);
    if (exists) return res.status(409).json({ ok: false, error: "Email já cadastrado" });

    const id = crypto.randomUUID();
    const now = Date.now();
    const password_hash = bcrypt.hashSync(password, 10);

    db.prepare(
      `INSERT INTO auth_users (id, email, name, role, password_hash, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 1, ?, ?)`
    ).run(id, email, name, "seller", password_hash, now, now);

    const user = { id, email, name, role: "seller" };
    const token = signToken(user);

    return res.json({ ok: true, token, user });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

// =========================
// Login
// =========================
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
    if (!ok) return res.status(401).json({ ok: false, error: "Credenciais inválidas" });

    const token = signToken(user);

    return res.json({
      ok: true,
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

// =========================
// Me
// =========================
router.get("/me", requireAuth, (req, res) => {
  const id = String(req.user.sub);
  const user = getUserById(id);

  if (!user) return res.status(401).json({ ok: false, error: "Sessão inválida" });
  if (user.is_active !== 1) return res.status(403).json({ ok: false, error: "Usuário desativado" });

  return res.json({ ok: true, user });
});

// =========================
// Update own profile
// =========================
router.put("/me", requireAuth, (req, res) => {
  try {
    const id = String(req.user.sub);
    const name = String(req.body?.name || "").trim();
    const email = norm(req.body?.email || "");

    if (!name || !email) {
      return res.status(400).json({ ok: false, error: "name e email são obrigatórios" });
    }

    const current = db
      .prepare(`SELECT id, email, role, is_active FROM auth_users WHERE id = ?`)
      .get(id);

    if (!current || current.is_active !== 1) {
      return res.status(401).json({ ok: false, error: "Sessão inválida" });
    }

    const emailInUse = db
      .prepare(`SELECT id FROM auth_users WHERE email = ? AND id <> ?`)
      .get(email, id);

    if (emailInUse) {
      return res.status(409).json({ ok: false, error: "E-mail já está em uso por outro usuário" });
    }

    db.prepare(
      `UPDATE auth_users
       SET name = ?, email = ?, updated_at = ?
       WHERE id = ?`
    ).run(name, email, Date.now(), id);

    const updatedUser = getUserById(id);
    const newToken = signToken(updatedUser);

    return res.json({
      ok: true,
      user: updatedUser,
      token: newToken,
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

// =========================
// Change password (logged user)
// =========================
router.post("/change-password", requireAuth, (req, res) => {
  try {
    const id = String(req.user.sub);
    const currentPassword = String(req.body?.currentPassword || "");
    const newPassword = String(req.body?.newPassword || "");

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ ok: false, error: "currentPassword e newPassword são obrigatórios" });
    }

    const user = db
      .prepare(`SELECT id, password_hash, is_active FROM auth_users WHERE id = ?`)
      .get(id);

    if (!user || user.is_active !== 1) {
      return res.status(401).json({ ok: false, error: "Sessão inválida" });
    }

    const ok = bcrypt.compareSync(currentPassword, user.password_hash);
    if (!ok) return res.status(401).json({ ok: false, error: "Senha atual incorreta" });

    const now = Date.now();
    const password_hash = bcrypt.hashSync(newPassword, 10);

    db.prepare(`UPDATE auth_users SET password_hash = ?, updated_at = ? WHERE id = ?`)
      .run(password_hash, now, id);

    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

// =========================
// Sellers list
// =========================
router.get("/sellers", requireAuth, (req, res) => {
  const rows = db
    .prepare(
      `SELECT id, email, name, role, is_active, created_at, updated_at
       FROM auth_users
       WHERE role = 'seller'
       ORDER BY name ASC`
    )
    .all();

  return res.json({ ok: true, items: rows });
});

// =========================
// Admin routes
// =========================
router.get("/users", requireAuth, requireAdmin, (req, res) => {
  const rows = db
    .prepare(
      `SELECT id, email, name, role, is_active, created_at, updated_at
       FROM auth_users
       ORDER BY created_at DESC`
    )
    .all();

  return res.json({ ok: true, items: rows });
});

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

    const exists = db.prepare(`SELECT id FROM auth_users WHERE email = ?`).get(email);
    if (exists) return res.status(409).json({ ok: false, error: "E-mail já cadastrado" });

    const id = crypto.randomUUID();
    const now = Date.now();
    const passHash = bcrypt.hashSync(password, 10);

    db.prepare(
      `INSERT INTO auth_users (id, email, name, password_hash, role, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 1, ?, ?)`
    ).run(id, email, name, passHash, role, now, now);

    return res.json({ ok: true, user: { id, email, name, role, is_active: 1 } });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

router.put("/users/:id", requireAuth, requireAdmin, (req, res) => {
  try {
    const id = String(req.params.id || "").trim();
    const name = String(req.body?.name || "").trim();
    const email = norm(req.body?.email || "");
    const role = String(req.body?.role || "seller").trim() || "seller";

    if (!id) return res.status(400).json({ ok: false, error: "id obrigatório" });
    if (!name || !email) return res.status(400).json({ ok: false, error: "name e email são obrigatórios" });

    const exists = db.prepare(`SELECT id FROM auth_users WHERE id = ?`).get(id);
    if (!exists) return res.status(404).json({ ok: false, error: "Usuário não encontrado" });

    const emailInUse = db.prepare(`SELECT id FROM auth_users WHERE email = ? AND id <> ?`).get(email, id);
    if (emailInUse) return res.status(409).json({ ok: false, error: "E-mail já está em uso por outro usuário" });

    db.prepare(
      `UPDATE auth_users
       SET name = ?, email = ?, role = ?, updated_at = ?
       WHERE id = ?`
    ).run(name, email, role, Date.now(), id);

    const user = getUserById(id);
    return res.json({ ok: true, user });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

router.post("/users/:id/reset-password", requireAuth, requireAdmin, (req, res) => {
  try {
    const id = String(req.params.id || "").trim();
    const newPassword = String(req.body?.newPassword || "");

    if (!id) return res.status(400).json({ ok: false, error: "id obrigatório" });
    if (!newPassword) return res.status(400).json({ ok: false, error: "newPassword é obrigatório" });

    const exists = db.prepare(`SELECT id FROM auth_users WHERE id = ?`).get(id);
    if (!exists) return res.status(404).json({ ok: false, error: "Usuário não encontrado" });

    const password_hash = bcrypt.hashSync(newPassword, 10);
    db.prepare(`UPDATE auth_users SET password_hash = ?, updated_at = ? WHERE id = ?`)
      .run(password_hash, Date.now(), id);

    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

router.patch("/users/:id/status", requireAuth, requireAdmin, (req, res) => {
  try {
    const id = String(req.params.id || "").trim();
    const is_active = Number(req.body?.is_active ? 1 : 0);

    if (!id) return res.status(400).json({ ok: false, error: "id obrigatório" });

    const exists = db.prepare(`SELECT id FROM auth_users WHERE id = ?`).get(id);
    if (!exists) return res.status(404).json({ ok: false, error: "Usuário não encontrado" });

    db.prepare(`UPDATE auth_users SET is_active = ?, updated_at = ? WHERE id = ?`)
      .run(is_active, Date.now(), id);

    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

router.delete("/users/:id/hard", requireAuth, requireAdmin, (req, res) => {
  try {
    const id = String(req.params.id || "").trim();
    if (!id) return res.status(400).json({ ok: false, error: "id obrigatório" });

    const exists = db.prepare(`SELECT id FROM auth_users WHERE id = ?`).get(id);
    if (!exists) return res.status(404).json({ ok: false, error: "Usuário não encontrado" });

    db.prepare(`DELETE FROM auth_users WHERE id = ?`).run(id);
    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

router.delete("/users/:id", requireAuth, requireAdmin, (req, res) => {
  const id = String(req.params.id || "").trim();
  if (!id) return res.status(400).json({ ok: false, error: "id obrigatório" });

  const exists = db.prepare(`SELECT id FROM auth_users WHERE id = ?`).get(id);
  if (!exists) return res.status(404).json({ ok: false, error: "Usuário não encontrado" });

  db.prepare(`UPDATE auth_users SET is_active = 0, updated_at = ? WHERE id = ?`)
    .run(Date.now(), id);

  return res.json({ ok: true });
});

router.post("/auth_users", requireAuth, requireAdmin, (req, res) => {
  req.url = "/users";
  return router.handle(req, res);
});

router.post("/create-seller", requireAuth, requireAdmin, (req, res) => {
  req.body = { ...(req.body || {}), role: "seller" };
  req.url = "/users";
  return router.handle(req, res);
});

export default router;