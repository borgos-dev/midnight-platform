// Plain non-"use server" module so it can hold the constants + types the
// external-links feature needs to share across server actions, server
// components, and client components.
//
// Next.js enforces that a "use server" file only exports async functions
// (every export becomes a server-action endpoint). The MAX cap + the
// row shape don't fit that constraint, so they live here instead.

import type { ExternalLinkKind } from "@prisma/client";

/**
 * Cap is enforced in the action layer (not the schema) so it can be
 * raised without a migration. Five is enough for the major channels and
 * small enough that the public profile stays readable.
 */
export const MAX_LINKS_PER_CREATOR = 5;

/**
 * Shape returned by listMyExternalLinks() and used by the dashboard
 * editor to render the current creator's links in order.
 */
export type ExternalLinkRow = {
  id: number;
  kind: ExternalLinkKind;
  url: string;
  displayOrder: number;
};
