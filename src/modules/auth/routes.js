const express = require("express");

function createAuthRoutes({ authController }) {
  const r = express.Router();
  r.post("/login", authController.login);
  return r;
}

module.exports = { createAuthRoutes };