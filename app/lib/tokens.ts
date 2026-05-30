import crypto from "crypto";

/**
 * Generate a cryptographically random token string (hex, 64 chars).
 */
export function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Hash a raw token with SHA-256 for safe storage.
 * Never store the raw token in the database.
 */
export function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}
