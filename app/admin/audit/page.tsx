import Link from "next/link";
import {
  UserCheck,
  UserX,
  Ban,
  RotateCcw,
  BadgeCheck,
  BadgeX,
  CreditCard,
  TrendingUp,
  Flag,
  CircleCheckBig,
  CircleX,
  Megaphone,
  Pause,
  Play,
  Trash2,
} from "lucide-react";
import type { AdminAction } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 100;

function fmt(d: Date): string {
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Per-action presentation tokens. Centralized so every row renders
// consistently regardless of what was decided. Keeps the audit page
// itself a thin presenter.
const ACTION_TOKENS: Record<
  AdminAction,
  {
    label: string;
    icon: React.ReactNode;
    color: string;
  }
> = {
  CREATOR_APPROVED: {
    label: "Approved creator",
    icon: <UserCheck size={14} strokeWidth={2.4} />,
    color: "#34d399",
  },
  CREATOR_REJECTED: {
    label: "Rejected creator",
    icon: <UserX size={14} strokeWidth={2.4} />,
    color: "#f87171",
  },
  CREATOR_SUSPENDED: {
    label: "Suspended creator",
    icon: <Ban size={14} strokeWidth={2.4} />,
    color: "#f87171",
  },
  CREATOR_RESTORED: {
    label: "Restored creator",
    icon: <RotateCcw size={14} strokeWidth={2.4} />,
    color: "#34d399",
  },
  CREATOR_VERIFIED: {
    label: "Verified creator",
    icon: <BadgeCheck size={14} strokeWidth={2.4} />,
    color: "#3b9eff",
  },
  CREATOR_UNVERIFIED: {
    label: "Un-verified creator",
    icon: <BadgeX size={14} strokeWidth={2.4} />,
    color: "#94a3b8",
  },
  SUBSCRIPTION_APPROVED: {
    label: "Approved subscription",
    icon: <CreditCard size={14} strokeWidth={2.4} />,
    color: "#a855f7",
  },
  BOOST_APPROVED: {
    label: "Approved boost",
    icon: <TrendingUp size={14} strokeWidth={2.4} />,
    color: "#a855f7",
  },
  BOOST_REJECTED: {
    label: "Rejected boost",
    icon: <CircleX size={14} strokeWidth={2.4} />,
    color: "#f87171",
  },
  REPORT_RESOLVED_REMOVED: {
    label: "Resolved report · violation",
    icon: <Flag size={14} strokeWidth={2.4} />,
    color: "#f87171",
  },
  REPORT_RESOLVED_NO_ACTION: {
    label: "Resolved report · no violation",
    icon: <CircleCheckBig size={14} strokeWidth={2.4} />,
    color: "#34d399",
  },
  REPORT_DISMISSED: {
    label: "Dismissed report",
    icon: <Ban size={14} strokeWidth={2.4} />,
    color: "#94a3b8",
  },
  AD_CREATED: {
    label: "Created ad",
    icon: <Megaphone size={14} strokeWidth={2.4} />,
    color: "#a855f7",
  },
  AD_UPDATED: {
    label: "Updated ad",
    icon: <Megaphone size={14} strokeWidth={2.4} />,
    color: "#a855f7",
  },
  AD_PAUSED: {
    label: "Paused ad",
    icon: <Pause size={14} strokeWidth={2.4} />,
    color: "#94a3b8",
  },
  AD_RESUMED: {
    label: "Resumed ad",
    icon: <Play size={14} strokeWidth={2.4} />,
    color: "#34d399",
  },
  AD_DELETED: {
    label: "Deleted ad",
    icon: <Trash2 size={14} strokeWidth={2.4} />,
    color: "#f87171",
  },
};

// Deep link rules per target type. Each entry returns a path the admin
// can click to inspect the affected entity. We keep this table tiny —
// no nested pages here, just a routing best-effort.
const TARGET_LINK: Record<string, (id: number) => string> = {
  creatorprofile: (id) => `/admin/creators?targetId=${id}`,
  subscription: (id) => `/admin/subscriptions`,
  boost: (id) => `/admin/boosts`,
  report: (id) => `/admin/reports`,
  ad: (id) => `/admin/ads`,
};

type SearchParams = Promise<{ action?: string }>;

/**
 * Admin audit log.
 *
 * Read-only timeline of every admin action. Useful when:
 *   - A creator emails support asking why they were suspended
 *   - You want to know what a co-admin did while you were off
 *   - Investigating fraud or process violations
 *
 * Filter by action type via `?action=CREATOR_APPROVED`. No date range
 * picker for MVP — the page-size limit of 100 covers most diagnostic
 * needs. A real audit UI with pagination + filters is a Phase 2 build.
 */
export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const resolved = await searchParams;
  const actionFilter = resolved?.action;

  // Whitelist the action filter against the enum so a crafted ?action=DROP_TABLE
  // doesn't get passed through to Prisma. (Prisma would reject it anyway, but
  // returning a clean empty result is nicer than throwing.)
  const validActions = Object.keys(ACTION_TOKENS) as AdminAction[];
  const safeAction =
    actionFilter && validActions.includes(actionFilter as AdminAction)
      ? (actionFilter as AdminAction)
      : null;

  const entries = await prisma.adminAuditLog.findMany({
    where: safeAction ? { action: safeAction } : undefined,
    include: {
      adminUser: { select: { id: true, email: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE,
  });

  return (
    <div className="min-h-screen bg-black text-white p-6 lg:p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Audit log</h1>
        <p className="text-white/50 text-sm mt-1">
          Every admin decision, attributable + searchable. Latest {PAGE_SIZE}{" "}
          actions shown.
        </p>
      </header>

      {/* Filter pills */}
      <div className="flex flex-wrap gap-1.5 mb-6">
        <Link
          href="/admin/audit"
          className={`inline-flex items-center rounded-full border px-3 py-1 text-xs transition ${
            !safeAction
              ? "border-purple-500/50 bg-purple-500/15 text-white"
              : "border-white/12 bg-white/3 text-white/55 hover:text-white hover:border-white/30"
          }`}
        >
          All
        </Link>
        {(["CREATOR_APPROVED", "CREATOR_REJECTED", "CREATOR_SUSPENDED", "CREATOR_VERIFIED", "SUBSCRIPTION_APPROVED", "BOOST_APPROVED", "REPORT_RESOLVED_REMOVED", "AD_CREATED"] as AdminAction[]).map((a) => {
          const tok = ACTION_TOKENS[a];
          const active = safeAction === a;
          return (
            <Link
              key={a}
              href={`/admin/audit?action=${a}`}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition ${
                active
                  ? "border-purple-500/50 bg-purple-500/15 text-white"
                  : "border-white/12 bg-white/3 text-white/55 hover:text-white hover:border-white/30"
              }`}
            >
              <span style={{ color: tok.color }}>{tok.icon}</span>
              {tok.label.replace(/^\w+\s/, "")}
            </Link>
          );
        })}
      </div>

      {/* Entries */}
      <div className="rounded-xl border border-white/10 bg-white/3 divide-y divide-white/8">
        {entries.length === 0 && (
          <div className="p-4 text-sm text-white/50">
            {safeAction
              ? "No actions of this type yet."
              : "No admin actions logged yet. Approve or reject something and it'll appear here."}
          </div>
        )}

        {entries.map((entry) => {
          const tok = ACTION_TOKENS[entry.action];
          const target =
            entry.targetType && entry.targetId
              ? {
                  type: entry.targetType,
                  id: entry.targetId,
                  href: TARGET_LINK[entry.targetType]?.(entry.targetId),
                }
              : null;
          const adminLabel =
            entry.adminUser?.name ?? entry.adminUser?.email ?? "—";

          return (
            <div
              key={entry.id}
              className="p-4 flex items-start gap-3 text-sm"
            >
              <span
                className="mt-0.5 inline-flex items-center justify-center w-7 h-7 rounded-md flex-shrink-0"
                style={{
                  background: `${tok.color}22`,
                  color: tok.color,
                }}
                aria-hidden
              >
                {tok.icon}
              </span>

              <div className="flex-1 min-w-0">
                <p className="font-medium">
                  <span style={{ color: tok.color }}>{tok.label}</span>{" "}
                  {target && (
                    <span className="text-white/55 text-xs ml-1">
                      {target.href ? (
                        <Link
                          href={target.href}
                          className="hover:text-white underline underline-offset-2 decoration-white/25"
                        >
                          {target.type} #{target.id}
                        </Link>
                      ) : (
                        <>
                          {target.type} #{target.id}
                        </>
                      )}
                    </span>
                  )}
                </p>
                <p className="text-xs text-white/45 mt-0.5">
                  by <span className="text-white/70">{adminLabel}</span> ·{" "}
                  {fmt(entry.createdAt)}
                </p>
                {entry.note && (
                  <p className="text-xs text-white/65 italic mt-1.5 leading-snug">
                    “{entry.note}”
                  </p>
                )}
                {entry.metadata && typeof entry.metadata === "object" && (
                  <details className="mt-1.5">
                    <summary className="text-[10px] text-white/35 cursor-pointer hover:text-white/55 transition">
                      context
                    </summary>
                    <pre className="mt-1 text-[10px] text-white/55 bg-black/30 border border-white/8 rounded p-2 overflow-x-auto">
                      {JSON.stringify(entry.metadata, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {entries.length === PAGE_SIZE && (
        <p className="mt-4 text-xs text-white/40 text-center">
          Showing the latest {PAGE_SIZE} actions. Older entries are still in
          the database but require pagination to view (Phase 2).
        </p>
      )}
    </div>
  );
}
