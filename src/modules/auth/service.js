const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

function httpError(message, status) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function createAuthService({ usersRepo }) {
  return {
    async login({ email, password }) {
      const e = String(email || "").trim().toLowerCase();
      const p = String(password || "");

      if (!e || !p) throw httpError("missing_credentials", 400);

      const user = usersRepo.findByEmail(e);
      if (!user) throw httpError("invalid_credentials", 401);
      if (!user.is_active) throw httpError("user_inactive", 403);

      const ok = await bcrypt.compare(p, user.password_hash);
      if (!ok) throw httpError("invalid_credentials", 401);

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role, name: user.name },
        process.env.JWT_SECRET,
        { expiresIn: "12h" }
      );

      return {
        token,
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
      };
    },
  };
}

module.exports = { createAuthService };