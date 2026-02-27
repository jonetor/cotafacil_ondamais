const bcrypt = require("bcrypt");
const { db } = require("./db");
const { ensureAdmin } = require("./db/seedAdmin");
require("dotenv").config();

const { db } = require("./db");
const { ensureAdmin } = require("./db/seedAdmin");
const { createApp } = require("./app");

(async () => {
  await ensureAdmin(db);

  const app = createApp();
  const port = process.env.PORT || 3000;

  app.listen(port, () => console.log(`BFF rodando na porta ${port}`));
})();

(async () => {
  await ensureAdmin(db);
})();
function createUsersService({ usersRepo }) {
  return {
    async createUser(data) {
      const email = (data.email || "").trim().toLowerCase();
      if (!data.name?.trim()) throw Object.assign(new Error("name_required"), { status: 400 });
      if (!email) throw Object.assign(new Error("email_required"), { status: 400 });
      if (!data.password || data.password.length < 6)
        throw Object.assign(new Error("password_min_6"), { status: 400 });

      const exists = usersRepo.findByEmail(email);
      if (exists) throw Object.assign(new Error("email_already_exists"), { status: 409 });

      const password_hash = await bcrypt.hash(data.password, 10);

      const id = usersRepo.insert({
        name: data.name.trim(),
        email,
        phone: data.phone,
        role: data.role || "seller",
        is_active: data.is_active !== false, // default true
        password_hash,
      });

      return usersRepo.findById(id);
    },

    listUsers(filters) {
      return usersRepo.list(filters);
    },

    getUser(id) {
      const u = usersRepo.findById(id);
      if (!u) throw Object.assign(new Error("user_not_found"), { status: 404 });
      // não devolve hash
      const { password_hash, ...safe } = u;
      return safe;
    },

    async updateUser(id, patch) {
      const u = usersRepo.findById(id);
      if (!u) throw Object.assign(new Error("user_not_found"), { status: 404 });

      if (patch.email) patch.email = patch.email.trim().toLowerCase();

      // se email mudar, validar unique
      if (patch.email && patch.email !== u.email) {
        const exists = usersRepo.findByEmail(patch.email);
        if (exists) throw Object.assign(new Error("email_already_exists"), { status: 409 });
      }

      usersRepo.update(id, patch);
      return this.getUser(id);
    },

    async changePassword({ actor, targetUserId, newPassword }) {
      if (!newPassword || newPassword.length < 6)
        throw Object.assign(new Error("password_min_6"), { status: 400 });

      const target = usersRepo.findById(targetUserId);
      if (!target) throw Object.assign(new Error("user_not_found"), { status: 404 });

      const isSelf = Number(actor.id) === Number(targetUserId);
      const isAdmin = actor.role === "admin";
      if (!isSelf && !isAdmin) throw Object.assign(new Error("forbidden"), { status: 403 });

      const hash = await bcrypt.hash(newPassword, 10);
      usersRepo.setPasswordHash(targetUserId, hash);
      return { ok: true };
    },

    setActive(id, is_active) {
      const u = usersRepo.findById(id);
      if (!u) throw Object.assign(new Error("user_not_found"), { status: 404 });
      usersRepo.setActive(id, is_active);
      return { ok: true };
    },
  };
}

module.exports = { createUsersService };