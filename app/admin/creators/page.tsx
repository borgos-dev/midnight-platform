import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { BadgeCheck, Ban, RotateCcw } from "lucide-react";
import { toggleVerified, toggleSuspended } from "./actions";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ status?: string }>;

/**
 * Creator verification + suspension surface.
 *
 * Two tab views (`?status=approved` default, `?status=suspended`):
 *   - APPROVED  → toggle verified flag (Chunk 5 work) + Suspend button (new)
 *   - SUSPENDED → Restore button + readonly metadata. Lets the admin
 *                  un-suspend without having to dig in Prisma Studio.
 *
 * Approvals (PENDING) and rejections live separately at
 * /admin/creators-pending — this page is for already-approved creators.
 */
export default async function AdminCreatorsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const resolved = await searchParams;
  const view: "approved" | "suspended" =
    resolved?.status === "suspended" ? "suspended" : "approved";

  const [creators, suspendedCount, approvedCount, pendingCount] =
    await Promise.all([
      prisma.creatorprofile.findMany({
        where: {
          status: view === "suspended" ? "SUSPENDED" : "APPROVED",
        },
        select: {
          id: true,
          displayName: true,
          tier: true,
          verified: true,
          location: true,
          status: true,
          user: { select: { email: true } },
        },
        orderBy:
          view === "suspended"
            ? [{ updatedAt: "desc" }]
            : [{ verified: "asc" }, { createdAt: "desc" }],
      }),
      prisma.creatorprofile.count({ where: { status: "SUSPENDED" } }),
      prisma.creatorprofile.count({ where: { status: "APPROVED" } }),
      prisma.creatorprofile.count({ where: { status: "PENDING" } }),
    ]);

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="flex items-baseline justify-between mb-3 flex-wrap gap-3">
        <h1 className="text-2xl font-semibold">Creator management</h1>
        <Link
          href="/admin/creators-pending"
          className="text-sm text-white/60 hover:text-white underline underline-offset-4 decoration-white/20"
        >
          Pending approvals
          {pendingCount > 0 && (
            <span className="ml-1.5 inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-200 text-label font-bold">
              {pendingCount}
            </span>
          )}
        </Link>
      </div>

      <p className="text-white/50 text-sm mb-5">
        Verify approved creators after off-platform ID review, or suspend
        accounts that violate platform rules. Suspended creators disappear
        from public surfaces immediately.
      </p>

      {/* View tabs */}
      <div className="flex gap-2 mb-6">
        <Link
          href="/admin/creators"
          className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm transition ${
            view === "approved"
              ? "bg-purple-500/15 border-purple-500/40 text-white"
              : "bg-white/3 border-white/10 text-white/60 hover:text-white hover:border-white/25"
          }`}
        >
          Approved
          <span className="text-xs tabular-nums opacity-70">{approvedCount}</span>
        </Link>
        <Link
          href="/admin/creators?status=suspended"
          className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm transition ${
            view === "suspended"
              ? "bg-rose-500/15 border-rose-500/40 text-white"
              : "bg-white/3 border-white/10 text-white/60 hover:text-white hover:border-white/25"
          }`}
        >
          Suspended
          <span className="text-xs tabular-nums opacity-70">{suspendedCount}</span>
        </Link>
      </div>

      <div className="space-y-3">
        {creators.length === 0 && (
          <p className="text-white/60 text-sm">
            {view === "suspended"
              ? "Nobody is suspended."
              : "No approved creators yet."}
          </p>
        )}

        {creators.map((c) => {
          const isSuspended = c.status === "SUSPENDED";
          return (
            <div
              key={c.id}
              className={`flex items-center justify-between gap-3 border rounded-xl p-4 flex-wrap ${
                isSuspended
                  ? "border-rose-500/30 bg-rose-500/5"
                  : "border-white/10 bg-white/5"
              }`}
            >
              <div className="min-w-0">
                <p className="font-semibold flex items-center gap-2">
                  <Link
                    href={`/creator/${c.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline underline-offset-4 decoration-white/40"
                  >
                    {c.displayName}
                  </Link>
                  {c.verified && (
                    <BadgeCheck size={16} className="text-sky-400" />
                  )}
                  <span className="text-xs text-white/40 font-normal">
                    #{c.id} · {c.tier}
                  </span>
                  {isSuspended && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 border border-rose-500/35 px-2 py-0.5 text-[10px] font-bold tracking-[0.10em] text-rose-300">
                      <Ban size={10} strokeWidth={2.5} />
                      SUSPENDED
                    </span>
                  )}
                </p>
                <p className="text-xs text-white/40 mt-0.5">
                  {c.user?.email ?? "—"} · {c.location ?? "no city"}
                </p>
              </div>

              <div className="flex gap-2 flex-shrink-0 flex-wrap">
                {!isSuspended && (
                  <form action={toggleVerified}>
                    <input type="hidden" name="creatorId" value={c.id} />
                    <button
                      type="submit"
                      className={
                        c.verified
                          ? "px-4 py-2 rounded-lg bg-white/10 text-sm font-semibold hover:bg-white/15 transition"
                          : "px-4 py-2 rounded-lg bg-sky-600 text-sm font-semibold hover:bg-sky-500 transition"
                      }
                    >
                      {c.verified ? "Un-verify" : "Mark verified"}
                    </button>
                  </form>
                )}

                <form action={toggleSuspended}>
                  <input type="hidden" name="creatorId" value={c.id} />
                  <button
                    type="submit"
                    className={
                      isSuspended
                        ? "inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-emerald-500/40 text-emerald-300 text-sm font-semibold hover:bg-emerald-500/10 transition"
                        : "inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-rose-500/40 text-rose-300 text-sm font-semibold hover:bg-rose-500/10 transition"
                    }
                  >
                    {isSuspended ? (
                      <>
                        <RotateCcw size={13} strokeWidth={2.4} />
                        Restore
                      </>
                    ) : (
                      <>
                        <Ban size={13} strokeWidth={2.4} />
                        Suspend
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
