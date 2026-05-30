// Client-safe password rule helpers.
//
// Lives in its own module (no bcrypt import) so a client component like
// PasswordStrengthMeter can import these constants + the pure-JS validator
// WITHOUT Turbopack trying to bundle bcrypt for the browser. bcrypt is a
// Node native add-on; pulling it into the client bundle fails the build:
//
//   Module not found: Can't resolve 'fs'
//     ./node_modules/node-gyp-build/node-gyp-build.js
//
// `passwords.ts` re-exports everything here so server-side callers keep
// importing from one place.

export const MIN_PASSWORD_LENGTH = 10;
export const MAX_PASSWORD_LENGTH = 128;

/**
 * Length-bounds check. Returns an error message string when the password
 * is too short / too long, otherwise null. Pure JS — safe in any runtime.
 */
export function isStrongEnough(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return `Password must be at most ${MAX_PASSWORD_LENGTH} characters.`;
  }
  return null;
}
