import { cookies } from "next/headers";

// Cookie used to remember a visitor's 18+ confirmation. Stored as the
// literal string "1" — its presence is the signal, the value just makes
// debugging in DevTools obvious.
const COOKIE_NAME = "mn_age_verified";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

/** True when the current visitor has confirmed they're 18+ within the
 *  rolling 30-day window. Server-only (reads request cookies). */
export async function isAgeVerified(): Promise<boolean> {
  const store = await cookies();
  return store.get(COOKIE_NAME)?.value === "1";
}

/** Write the verification cookie. Called from the age-gate server action
 *  once the visitor clicks "I am 18 or older". */
export async function rememberAgeVerified(): Promise<void> {
  const store = await cookies();
  store.set({
    name: COOKIE_NAME,
    value: "1",
    httpOnly: false, // readable from JS — analytics may want to see the flag
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });
}
