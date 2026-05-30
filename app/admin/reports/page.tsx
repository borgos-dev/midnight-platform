import Link from "next/link";
import {
  resolveReportRemoved,
  resolveReportNoAction,
  dismissReport,
} from "./actions";
import { prisma } from "@/lib/prisma";
import { AlertTriangle, CircleCheckBig, CircleX, Ban } from "lucide-react";

export const dynamic = "force-dynamic";

function fmt(d: Date | null | undefined): string {
  if (!d) return "—";
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const CATEGORY_LABELS: Record<string, string> = {
  TRAFFICKING_OR_MINORS: "Trafficking or minors",
  IMPERSONATION: "Impersonation",
  STOLEN_CONTENT: "Stolen content",
  HARASSMENT: "Harassment",
  ILLEGAL_SERVICES: "Illegal services",
  OTHER: "Other",
};

/**
 * Content reports queue.
 *
 * Three sections:
 *   1. PENDING (top, sorted by urgency: TRAFFICKING_OR_MINORS first,
 *      then by oldest createdAt)
 *   2. Decision form per row — admins pick an outcome with optional note
 *      and optional "also suspend creator" checkbox on the Remove path
 *   3. RECENT DECISIONS (bottom, last 8 closed reports for audit)
 *
 * Why we sort trafficking ahead of FIFO: those are the only reports where
 * a delay can cause real harm. Everything else is comfortable on
 * first-in-first-out review.
 */
export default async function AdminReportsPage() {
  // Custom sort: TRAFFICKING_OR_MINORS first, then oldest. Prisma can't
  // express a CASE-WHEN ordering directly, so we fetch + sort in JS.
  // Volumes are tiny in MVP; revisit if the queue ever hits 1000+.
  const pendingAll = await prisma.report.findMany({
    where: { status: "PENDING_REVIEW" },
    include: {
      creatorprofile: {
        select: {
          id: true,
          displayName: true,
          status: true,
          user: { select: { email: true } },
        },
      },
      reporterUser: { select: { email: true } },
    },
  });
  const pending = pendingAll.sort((a, b) => {
    const aUrgent = a.category === "TRAFFICKING_OR_MINORS" ? 0 : 1;
    const bUrgent = b.category === "TRAFFICKING_OR_MINORS" ? 0 : 1;
    if (aUrgent !== bUrgent) return aUrgent - bUrgent;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });

  const recent = await prisma.report.findMany({
    where: { status: { not: "PENDING_REVIEW" } },
    include: {
      creatorprofile: { select: { id: true, displayName: true } },
    },
    orderBy: { reviewedAt: "desc" },
    take: 8,
  });

  return (
    <div className="min-h-screen bg-black text-white p-6 lg:p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Content reports</h1>
        <p className="text-white/50 text-sm mt-1">
          Visitor-submitted reports. Urgent categories surface first.
          Resolutions are logged with your name + timestamp.
        </p>
      </header>

      {/* PENDING */}
      <section className="mb-10">
        <h2 className="text-sm font-bold uppercase tracking-widest text-white/40 mb-3">
          Pending — {pending.length}
        </h2>

        <div className="space-y-3">
          {pending.length === 0 && (
            <p className="text-white/50 text-sm">
              Nothing waiting. The platform is quiet right now.
            </p>
          )}

          {pending.map((r) => {
            const urgent = r.category === "TRAFFICKING_OR_MINORS";
            const targetSuspended = r.creatorprofile?.status === "SUSPENDED";
            return (
              <div
                key={r.id}
                className={`rounded-xl p-4 border ${
                  urgent
                    ? "border-rose-500/50 bg-rose-500/8"
                    : "border-white/10 bg-white/5"
                }`}
              >
                {urgent && (
                  <div className="flex items-center gap-1.5 mb-3 text-[10px] font-bold tracking-[0.14em] text-rose-300">
                    <AlertTriangle size={11} strokeWidth={2.5} />
                    URGENT · TRAFFICKING OR MINORS
                  </div>
                )}

                <div className="flex items-baseline justify-between gap-3 mb-2 flex-wrap">
                  <p className="font-semibold">
                    <Link
                      href={`/creator/${r.creatorprofile?.id ?? ""}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline underline-offset-4 decoration-white/40"
                    >
                      {r.creatorprofile?.displayName ?? "—"}
                    </Link>{" "}
                    <span className="text-xs text-white/35 font-normal">
                      #{r.creatorprofile?.id ?? "?"}
                    </span>
                    {targetSuspended && (
                      <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-rose-500/15 border border-rose-500/35 px-2 py-0.5 text-[10px] font-bold tracking-[0.10em] text-rose-300">
                        <Ban size={10} strokeWidth={2.5} />
                        ALREADY SUSPENDED
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-white/40">
                    Filed {fmt(r.createdAt)}
                  </p>
                </div>

                <p className="text-sm">
                  <span className="text-white/45">Category:</span>{" "}
                  <span className="text-white/85">
                    {CATEGORY_LABELS[r.category ?? "OTHER"] ?? "Other"}
                  </span>
                </p>
                <p className="text-sm mt-1">
                  <span className="text-white/45">Reporter:</span>{" "}
                  <span className="text-white/85">
                    {r.reporterUser?.email ?? "anonymous"}
                  </span>
                </p>

                <div className="mt-3 rounded-lg border border-white/8 bg-black/30 p-3">
                  <p className="text-[10px] font-bold tracking-[0.10em] text-white/40 mb-1">
                    REPORT
                  </p>
                  <p className="text-sm whitespace-pre-wrap text-white/80 leading-relaxed">
                    {r.reason}
                  </p>
                </div>

                {/* Decision forms — three actions, side by side. */}
                <div className="mt-4 grid md:grid-cols-2 gap-3">
                  <form
                    action={resolveReportRemoved}
                    className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-3"
                  >
                    <input
                      type="hidden"
                      name="reportId"
                      value={r.id.toString()}
                    />
                    <p className="text-[10px] font-bold tracking-[0.10em] text-rose-300 mb-2">
                      VIOLATION CONFIRMED
                    </p>
                    <input
                      type="text"
                      name="note"
                      placeholder="What did you find? (required)"
                      required
                      maxLength={500}
                      className="w-full rounded-md bg-black/40 border border-white/10 px-2.5 py-1.5 text-xs placeholder:text-white/30 focus:outline-none focus:border-rose-500/50"
                    />
                    {!targetSuspended && (
                      <label className="mt-2 flex items-center gap-2 text-xs text-white/65 cursor-pointer">
                        <input
                          type="checkbox"
                          name="suspendCreator"
                          className="accent-rose-600"
                        />
                        Also suspend this creator
                      </label>
                    )}
                    <button
                      type="submit"
                      className="mt-2 w-full rounded-md bg-rose-600 hover:bg-rose-500 px-3 py-1.5 text-xs font-semibold transition"
                    >
                      Resolve · removed
                    </button>
                  </form>

                  <form
                    action={resolveReportNoAction}
                    className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3"
                  >
                    <input
                      type="hidden"
                      name="reportId"
                      value={r.id.toString()}
                    />
                    <p className="text-[10px] font-bold tracking-[0.10em] text-emerald-300 mb-2">
                      NO VIOLATION
                    </p>
                    <input
                      type="text"
                      name="note"
                      placeholder="Optional note"
                      maxLength={500}
                      className="w-full rounded-md bg-black/40 border border-white/10 px-2.5 py-1.5 text-xs placeholder:text-white/30 focus:outline-none focus:border-emerald-500/40"
                    />
                    <button
                      type="submit"
                      className="mt-2 w-full rounded-md border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold transition"
                    >
                      Resolve · no action
                    </button>
                  </form>
                </div>

                <form action={dismissReport} className="mt-2">
                  <input
                    type="hidden"
                    name="reportId"
                    value={r.id.toString()}
                  />
                  <button
                    type="submit"
                    className="text-xs text-white/35 hover:text-white/65 underline underline-offset-2 transition"
                  >
                    Dismiss as spam / duplicate
                  </button>
                </form>
              </div>
            );
          })}
        </div>
      </section>

      {/* RECENT */}
      <section>
        <h2 className="text-sm font-bold uppercase tracking-widest text-white/40 mb-3">
          Recently resolved
        </h2>
        <div className="rounded-xl border border-white/10 bg-white/3 divide-y divide-white/8">
          {recent.length === 0 && (
            <div className="p-4 text-sm text-white/40">
              Nothing yet. Closed reports will show here for audit.
            </div>
          )}
          {recent.map((r) => {
            const icon =
              r.status === "RESOLVED_REMOVED" ? (
                <CircleX
                  size={16}
                  className="text-rose-400 mt-0.5"
                  strokeWidth={2.2}
                />
              ) : r.status === "RESOLVED_NO_ACTION" ? (
                <CircleCheckBig
                  size={16}
                  className="text-emerald-400 mt-0.5"
                  strokeWidth={2.2}
                />
              ) : (
                <Ban size={16} className="text-white/40 mt-0.5" strokeWidth={2.2} />
              );
            const verb =
              r.status === "RESOLVED_REMOVED"
                ? "Removed"
                : r.status === "RESOLVED_NO_ACTION"
                  ? "No action"
                  : "Dismissed";
            return (
              <div
                key={r.id}
                className="p-3 flex items-start gap-3 text-sm flex-wrap"
              >
                {icon}
                <div className="flex-1 min-w-0">
                  <p>
                    <strong>{r.creatorprofile?.displayName ?? "—"}</strong>{" "}
                    <span className="text-white/40 text-xs">
                      #{r.creatorprofile?.id ?? "?"} · {CATEGORY_LABELS[r.category ?? "OTHER"] ?? "Other"}
                    </span>
                  </p>
                  <p className="text-xs text-white/45 mt-0.5">
                    {verb} · {fmt(r.reviewedAt)}
                  </p>
                  {r.reviewNote && (
                    <p className="text-xs text-white/55 italic mt-1">
                      “{r.reviewNote}”
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
