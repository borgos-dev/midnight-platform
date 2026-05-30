import { Prisma } from "@prisma/client";
import type { AdminAction, PrismaClient } from "@prisma/client";

/**
 * Shared writer for the AdminAuditLog table.
 *
 * Designed so callers can use either the global prisma client (default)
 * OR a transaction client when they want the audit row to commit atomically
 * with the underlying mutation. Pass `tx` from inside a `prisma.$transaction`
 * callback to get atomic logging — that's the recommended pattern for
 * anything where "the action happened" and "the log says it happened"
 * must always agree.
 *
 * Example (atomic):
 *   await prisma.$transaction(async (tx) => {
 *     await tx.creatorprofile.update({ ... });
 *     await logAdminAction(tx, { ... });
 *   });
 *
 * Example (fire-and-forget, when the underlying write is non-transactional):
 *   await prisma.creatorprofile.update({ ... });
 *   await logAdminAction(prisma, { ... });
 */
export type AuditClient = PrismaClient | Prisma.TransactionClient;

export type AdminActionInput = {
  adminUserId: number;
  action: AdminAction;
  /** Convention: lowercase model name ("creatorprofile", "subscription",
   *  "boost", "report", "ad"). Used by the audit page to deep-link back
   *  to the affected row when applicable. */
  targetType?: string;
  targetId?: number;
  /** Human-readable summary the audit page surfaces inline. Truncated to
   *  500 chars defensively in case a caller pipes through user-supplied
   *  text without trimming. */
  note?: string | null;
  /** Optional structured context — tier, plan, duration, etc. Inspectable
   *  on the audit page detail row but not formatted into the summary. */
  metadata?: Record<string, unknown> | null;
};

export async function logAdminAction(
  client: AuditClient,
  input: AdminActionInput,
): Promise<void> {
  const trimmedNote =
    typeof input.note === "string"
      ? input.note.trim().slice(0, 500) || null
      : null;

  await client.adminAuditLog.create({
    data: {
      adminUserId: input.adminUserId,
      action: input.action,
      targetType: input.targetType ?? null,
      targetId: input.targetId ?? null,
      note: trimmedNote,
      metadata: (input.metadata as Prisma.InputJsonValue) ?? Prisma.JsonNull,
    },
  });
}
