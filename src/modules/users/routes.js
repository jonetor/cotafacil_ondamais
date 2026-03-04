const express = require("express");
const { authRequired, requireRole } = require("../../middleware/authRequired");

function createUsersRoutes({ usersController }) {
  const r = express.Router();

  r.get("/me", authRequired, usersController.me);

  // ADMIN
  r.post("/", authRequired, requireRole("admin"), usersController.create);
  r.get("/", authRequired, requireRole("admin"), usersController.list);
  r.get("/:id", authRequired, requireRole("admin"), usersController.get);
  r.put("/:id", authRequired, requireRole("admin"), usersController.update);
  r.patch("/:id/status", authRequired, requireRole("admin"), usersController.setStatus);

  // Admin ou o próprio usuário
  r.patch("/:id/password", authRequired, usersController.changePassword);

  return r;
}

module.exports = { createUsersRoutes };