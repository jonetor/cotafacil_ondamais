// bff-node/seedAdmin.js
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import { db } from "./db.js";

function normEmail(email) {
  return String(email || "").toLowerCase().trim();
}

export async function seedAdmin() {
  const adminEmail = normEmail(process.env.ADMIN_EMAIL || "admin@ondamais.ai");
  const adminName = String(process.env.ADMIN_NAME || "Administrador").trim();
  const adminPass = String(process.env.ADMIN_PASSWORD || "102030");

  const now = Date.now();

  // procura por esse email
  const existing = db
    .prepare(`SELECT id, email, role FROM auth_users WHERE email=? LIMIT 1`)
    .get(adminEmail);

  if (!existing) {
    // cria novo admin
    const id = uuidv4();
    const password_hash = await bcrypt.hash(adminPass, 10);

    db.prepare(`
      INSERT INTO auth_users (id, email, name, role, password_hash, is_active, created_at, updated_at)
      VALUES (?, ?, ?, 'admin', ?, 1, ?, ?)
    `).run(id, adminEmail, adminName, password_hash, now, now);

    console.log(`[seedAdmin] ✅ Admin criado: ${adminEmail} / senha: ${adminPass}`);
    return;
  }

  // garante role admin + ativo + senha correta (isso resolve "credenciais inválidas")
  const password_hash = await bcrypt.hash(adminPass, 10);

  db.prepare(`
    UPDATE auth_users
    SET
      name = ?,
      role = 'admin',
      password_hash = ?,
      is_active = 1,
      updated_at = ?
    WHERE email = ?
  `).run(adminName, password_hash, now, adminEmail);

  console.log(`[seedAdmin] ✅ Admin garantido: ${adminEmail} / senha: ${adminPass}`);
}