const bcrypt = require("bcrypt");

async function ensureAdmin(db) {
  const adminEmail = (process.env.ADMIN_EMAIL || "admin@cotafacil.local").toLowerCase();
  const adminPass = process.env.ADMIN_PASSWORD || "Admin@123";

  const exists = db.prepare(`SELECT id FROM users WHERE email = ? LIMIT 1`).get(adminEmail);
  if (exists) return;

  const hash = await bcrypt.hash(adminPass, 10);

  db.prepare(`
    INSERT INTO users (name, email, phone, role, is_active, password_hash, created_at, updated_at)
    VALUES (?, ?, ?, 'admin', 1, ?, datetime('now'), datetime('now'))
  `).run("Administrador", adminEmail, null, hash);

  console.log(`[seed] Admin criado: ${adminEmail} senha inicial: ${adminPass}`);
}

module.exports = { ensureAdmin };