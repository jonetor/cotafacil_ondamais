import crypto from "node:crypto";
import { db } from "./db.js";

db.exec(`
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  user_name TEXT,
  user_email TEXT,
  action TEXT,
  entity TEXT,
  entity_id TEXT,
  details TEXT,
  created_at INTEGER
);
`);

export function writeAuditLog({
  user = null,
  action = "",
  entity = "",
  entity_id = "",
  details = null,
}) {
  const id = crypto.randomUUID();
  const now = Date.now();

  db.prepare(`
    INSERT INTO audit_logs (
      id,
      user_id,
      user_name,
      user_email,
      action,
      entity,
      entity_id,
      details,
      created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    user?.sub || user?.id || null,
    user?.name || null,
    user?.email || null,
    String(action || ""),
    String(entity || ""),
    String(entity_id || ""),
    details ? JSON.stringify(details) : null,
    now
  );

  return id;
}