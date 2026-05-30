// Server-side age validation for the signup form.
// Single source of truth so the UI (client-side `max` attribute) and the
// API route (final server gate) never drift.

import { computeAge } from "@/app/lib/creator-shape";

/** Minimum age in whole years a creator must be to sign up on Midnight.
 *  Enforced server-side; the signup form also sets `max` on its date input
 *  to today minus this many years so browsers' native pickers can't pick
 *  an out-of-range date. */
export const MIN_AGE_YEARS = 18;

/** Sanity cap so an obvious typo (e.g. 1850) doesn't make it through.
 *  Old creators don't need rejection — they just need to be flagged so we
 *  ask them to recheck. */
export const MAX_AGE_YEARS = 120;

export type AgeValidationResult =
  | { ok: true; date: Date }
  | { ok: false; error: string };

/**
 * Parse a YYYY-MM-DD string (from `<input type="date">` or an API client)
 * into a UTC Date and verify the resulting age clears MIN_AGE_YEARS and is
 * below MAX_AGE_YEARS. Returns a discriminated union so callers don't have
 * to throw / catch.
 *
 * Why UTC: native date inputs return YYYY-MM-DD with no timezone. Parsing
 * via `new Date("YYYY-MM-DD")` is interpreted as UTC midnight by the spec.
 * Storing it that way means a creator's "31 March" stays "31 March"
 * regardless of where the server's clock lives.
 */
export function validateBirthDate(raw: string | null | undefined): AgeValidationResult {
  if (!raw || typeof raw !== "string") {
    return { ok: false, error: "Birth date is required." };
  }
  const trimmed = raw.trim();
  // Enforce YYYY-MM-DD shape — guards against locale-dependent parsing.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return { ok: false, error: "Birth date must be in YYYY-MM-DD format." };
  }

  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) {
    return { ok: false, error: "That isn't a valid date." };
  }
  if (date.getTime() > Date.now()) {
    return { ok: false, error: "Birth date can't be in the future." };
  }

  const age = computeAge(date);
  if (age === null) {
    return { ok: false, error: "Couldn't read that birth date." };
  }
  if (age < MIN_AGE_YEARS) {
    return {
      ok: false,
      error: `You must be at least ${MIN_AGE_YEARS} years old to join Midnight.`,
    };
  }
  if (age > MAX_AGE_YEARS) {
    return { ok: false, error: "Please double-check the year you entered." };
  }

  return { ok: true, date };
}

/** YYYY-MM-DD string for "today minus MIN_AGE_YEARS". Useful as the `max`
 *  attribute of a date input so browser pickers block underage selections.
 *  Computed in UTC so the cutoff is stable across server timezones. */
export function maxBirthDateForMinAge(): string {
  const now = new Date();
  const cutoff = new Date(
    Date.UTC(
      now.getUTCFullYear() - MIN_AGE_YEARS,
      now.getUTCMonth(),
      now.getUTCDate(),
    ),
  );
  return cutoff.toISOString().slice(0, 10);
}
