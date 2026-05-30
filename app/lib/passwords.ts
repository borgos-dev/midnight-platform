// Server-only password helpers. Never import this from a client component:
// bcrypt is a Node native add-on and Turbopack will try to bundle it for
// the browser. Use `passwords-rules.ts` for any client-side length/strength
// checks — it has the same constants without the bcrypt dependency.

import bcrypt from "bcrypt";

// Re-export the client-safe rules so server callers keep importing from
// one place. Anything new that's pure-JS should live in passwords-rules.ts.
export {
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_LENGTH,
  isStrongEnough,
} from "./passwords-rules";

export const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS ?? 12);

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export function comparePassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
