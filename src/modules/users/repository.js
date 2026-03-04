function createUsersRepository(db) {
  return {
    findByEmail(email) {
      return db.prepare(`SELECT * FROM users WHERE email = ? LIMIT 1`).get(email.toLowerCase());
    },

    findById(id) {
      return db.prepare(`SELECT * FROM users WHERE id = ? LIMIT 1`).get(id);
    },

    list({ q, role, is_active } = {}) {
      const where = [];
      const params = {};

      if (q) {
        where.push("(name LIKE @q OR email LIKE @q OR phone LIKE @q)");
        params.q = `%${q}%`;
      }
      if (role) {
        where.push("role = @role");
        params.role = role;
      }
      if (is_active !== undefined && is_active !== null) {
        where.push("is_active = @is_active");
        params.is_active = Number(is_active) ? 1 : 0;
      }

      const sql = `
        SELECT id, name, email, phone, role, is_active, created_at, updated_at
        FROM users
        ${where.length ? "WHERE " + where.join(" AND ") : ""}
        ORDER BY id DESC
      `;
      return db.prepare(sql).all(params);
    },

    insert({ name, email, phone, role, is_active, password_hash }) {
      const info = db.prepare(`
        INSERT INTO users (name, email, phone, role, is_active, password_hash, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `).run(
        name,
        email.toLowerCase(),
        phone || null,
        role || "seller",
        is_active ? 1 : 0,
        password_hash
      );
      return info.lastInsertRowid;
    },

    update(id, { name, email, phone, role, is_active }) {
      db.prepare(`
        UPDATE users
        SET
          name = COALESCE(?, name),
          email = COALESCE(?, email),
          phone = COALESCE(?, phone),
          role = COALESCE(?, role),
          is_active = COALESCE(?, is_active),
          updated_at = datetime('now')
        WHERE id = ?
      `).run(
        name ?? null,
        email ? email.toLowerCase() : null,
        phone ?? null,
        role ?? null,
        is_active === undefined ? null : (Number(is_active) ? 1 : 0),
        id
      );
    },

    setPasswordHash(id, password_hash) {
      db.prepare(`
        UPDATE users
        SET password_hash = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(password_hash, id);
    },

    setActive(id, is_active) {
      db.prepare(`
        UPDATE users
        SET is_active = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(Number(is_active) ? 1 : 0, id);
    },
  };
}

module.exports = { createUsersRepository };