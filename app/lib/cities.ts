/**
 * Canonical list of major Cameroonian cities that creators can pick from
 * in their profile editor.
 *
 * Why a fixed list (instead of free-text)?
 *   - The homepage location filter aggregates creators by city. Free-text
 *     would split "Douala" / "DOUALA" / "Doula" (typo) across separate
 *     buckets, producing wrong counts and broken filters.
 *   - A fixed list lets us guarantee canonical spelling (Yaoundé with
 *     diacritic, not "Yaounde") so URL params (`?city=Yaoundé`) and DB
 *     values match exactly.
 *   - Single source of truth — used by the profile editor dropdown AND
 *     the server-side validator.
 *
 * Ordering: by population / metropolitan significance, roughly. Visitors
 * see "Find your night" cards in count-order (driven by DB), so this
 * order only matters in the profile editor dropdown.
 *
 * Adding a city: just append it here, then `npx prisma generate` is not
 * needed (this is just a TypeScript constant — no schema migration).
 *
 * When we expand to other countries, this becomes a per-country list
 * (e.g. CAMEROON_CITIES + NIGERIA_CITIES + ...) and the profile editor
 * picks based on the creator's country selection.
 */
export const CAMEROON_CITIES = [
  "Douala",
  "Yaoundé",
  "Bamenda",
  "Bafoussam",
  "Garoua",
  "Maroua",
  "Ngaoundéré",
  "Bertoua",
  "Buea",
  "Limbe",
  "Kumba",
  "Nkongsamba",
  "Edéa",
  "Kribi",
  "Ebolowa",
  "Dschang",
  "Foumban",
] as const;

export type CameroonCity = (typeof CAMEROON_CITIES)[number];

/**
 * Type guard for runtime validation — the server uses this to reject
 * invalid city values posted from the profile editor.
 */
export function isValidCameroonCity(value: string): value is CameroonCity {
  return (CAMEROON_CITIES as readonly string[]).includes(value);
}
