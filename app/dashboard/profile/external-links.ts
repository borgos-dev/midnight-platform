// app/dashboard/profile/external-links.ts
"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { ExternalLinkKind } from "@prisma/client";
import { getCurrentUserId } from "@/app/lib/auth-helpers";
import {
  MAX_LINKS_PER_CREATOR,
  type ExternalLinkRow,
} from "./external-links-config";

// Re-exporting the constants/types from a "use server" file would still
// trigger the "only async functions can be exported" rule — Next.js
// treats every export from a server-action file as an endpoint. Both
// shared values now live in external-links-config.ts; this file imports
// them for internal use only.

const VALID_KINDS: ExternalLinkKind[] = [
  "INSTAGRAM",
  "TIKTOK",
  "SNAPCHAT",
  "ONLYFANS",
  "TELEGRAM",
  "TWITTER",
  "YOUTUBE",
  "WEBSITE",
];

/**
 * Validate that a string is a well-formed https URL with a real hostname.
 * Returns the parsed URL on success, null on rejection. We accept any host
 * (no per-kind domain whitelist) because creators frequently use linktree-
 * style aggregators or custom domains for OnlyFans. The trade-off: a
 * creator could mislabel an Instagram link as a YouTube one — visitors
 * would see the wrong icon. That's a creator-side mistake, not a security
 * issue.
 */
function validateUrl(raw: unknown): URL | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (trimmed.length === 0 || trimmed.length > 500) return null;
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }
  // https only — refusing http stops "downgrade your visitors to an
  // insecure page" attacks and keeps everything in the platform on TLS.
  if (parsed.protocol !== "https:") return null;
  if (!parsed.hostname || parsed.hostname.length < 3) return null;
  return parsed;
}

/**
 * Look up the calling user's creator profile id, or null if the user
 * isn't signed in / isn't a creator. Every mutation below funnels through
 * this so anonymous visitors can't touch any creator's links.
 */
async function getOwnerProfileId(): Promise<number | null> {
  const userId = await getCurrentUserId();
  if (!userId) return null;
  const profile = await prisma.creatorprofile.findUnique({
    where: { userId },
    select: { id: true, status: true },
  });
  if (!profile) return null;
  // Only APPROVED creators can manage links — visitors shouldn't see a
  // PENDING creator's profile anyway, so adding links would be wasted work.
  if (profile.status !== "APPROVED") return null;
  return profile.id;
}

/**
 * Load the current creator's links in display order. Server-only — the
 * dashboard profile page calls this directly during render.
 */
export async function listMyExternalLinks(): Promise<ExternalLinkRow[]> {
  const ownerId = await getOwnerProfileId();
  if (ownerId === null) return [];
  const rows = await prisma.creatorExternalLink.findMany({
    where: { creatorprofileId: ownerId },
    orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
    select: { id: true, kind: true, url: true, displayOrder: true },
  });
  return rows;
}

type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Add a single link. Enforces the per-creator cap + kind whitelist + URL
 * shape. Display order goes to the end of the list automatically.
 */
export async function addExternalLink(
  kind: ExternalLinkKind,
  rawUrl: string,
): Promise<ActionResult> {
  const ownerId = await getOwnerProfileId();
  if (ownerId === null) return { ok: false, error: "Not signed in or not an approved creator." };

  if (!VALID_KINDS.includes(kind)) return { ok: false, error: "Unknown link kind." };

  const parsed = validateUrl(rawUrl);
  if (!parsed) return { ok: false, error: "Enter a valid https:// URL." };

  const existing = await prisma.creatorExternalLink.count({
    where: { creatorprofileId: ownerId },
  });
  if (existing >= MAX_LINKS_PER_CREATOR) {
    return { ok: false, error: `You can only have ${MAX_LINKS_PER_CREATOR} links. Remove one first.` };
  }

  await prisma.creatorExternalLink.create({
    data: {
      creatorprofileId: ownerId,
      kind,
      url: parsed.toString(),
      // Place new links at the end. `existing` is the current count, which
      // doubles as the next 0-indexed slot.
      displayOrder: existing,
    },
  });

  revalidatePath("/dashboard/profile");
  revalidatePath(`/creator/${ownerId}`);
  return { ok: true };
}

/**
 * Update a single link's URL and/or kind. Same validation as add. Caller
 * passes the link id; we re-check ownership via creatorprofileId.
 */
export async function updateExternalLink(
  linkId: number,
  kind: ExternalLinkKind,
  rawUrl: string,
): Promise<ActionResult> {
  const ownerId = await getOwnerProfileId();
  if (ownerId === null) return { ok: false, error: "Not signed in or not an approved creator." };

  if (!VALID_KINDS.includes(kind)) return { ok: false, error: "Unknown link kind." };

  const parsed = validateUrl(rawUrl);
  if (!parsed) return { ok: false, error: "Enter a valid https:// URL." };

  const existing = await prisma.creatorExternalLink.findUnique({
    where: { id: linkId },
    select: { creatorprofileId: true },
  });
  if (!existing || existing.creatorprofileId !== ownerId) {
    return { ok: false, error: "Link not found." };
  }

  await prisma.creatorExternalLink.update({
    where: { id: linkId },
    data: { kind, url: parsed.toString() },
  });

  revalidatePath("/dashboard/profile");
  revalidatePath(`/creator/${ownerId}`);
  return { ok: true };
}

/**
 * Delete one link. Re-numbers the remaining links so displayOrder stays
 * contiguous (0, 1, 2, …). Avoids gaps that would make future inserts
 * land in unexpected positions.
 */
export async function deleteExternalLink(
  linkId: number,
): Promise<ActionResult> {
  const ownerId = await getOwnerProfileId();
  if (ownerId === null) return { ok: false, error: "Not signed in or not an approved creator." };

  const existing = await prisma.creatorExternalLink.findUnique({
    where: { id: linkId },
    select: { creatorprofileId: true },
  });
  if (!existing || existing.creatorprofileId !== ownerId) {
    return { ok: false, error: "Link not found." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.creatorExternalLink.delete({ where: { id: linkId } });
    const remaining = await tx.creatorExternalLink.findMany({
      where: { creatorprofileId: ownerId },
      orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
      select: { id: true },
    });
    // Re-number contiguously. Loop is fine — links are capped at 5.
    for (let i = 0; i < remaining.length; i++) {
      await tx.creatorExternalLink.update({
        where: { id: remaining[i].id },
        data: { displayOrder: i },
      });
    }
  });

  revalidatePath("/dashboard/profile");
  revalidatePath(`/creator/${ownerId}`);
  return { ok: true };
}

/**
 * Reorder by giving the full ordered list of link ids. The action verifies
 * every id belongs to the calling creator before any writes happen, so a
 * malicious payload can't move another creator's links around.
 */
export async function reorderExternalLinks(
  orderedIds: number[],
): Promise<ActionResult> {
  const ownerId = await getOwnerProfileId();
  if (ownerId === null) return { ok: false, error: "Not signed in or not an approved creator." };

  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    return { ok: false, error: "No links to reorder." };
  }

  const owned = await prisma.creatorExternalLink.findMany({
    where: { creatorprofileId: ownerId },
    select: { id: true },
  });
  const ownedSet = new Set(owned.map((r) => r.id));

  // The payload must list exactly the calling creator's links — same set,
  // no extras, no missing. Anything else and we refuse the whole reorder.
  if (orderedIds.length !== owned.length) {
    return { ok: false, error: "Reorder list doesn't match your links." };
  }
  for (const id of orderedIds) {
    if (!ownedSet.has(id)) {
      return { ok: false, error: "Reorder list contains links that aren't yours." };
    }
  }

  await prisma.$transaction(
    orderedIds.map((id, idx) =>
      prisma.creatorExternalLink.update({
        where: { id },
        data: { displayOrder: idx },
      }),
    ),
  );

  revalidatePath("/dashboard/profile");
  revalidatePath(`/creator/${ownerId}`);
  return { ok: true };
}
