import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { computeAge } from "@/app/lib/creator-shape";
import { approveCreator, rejectCreator } from "./actions";

export const dynamic = "force-dynamic";

function maskEmail(email: string | null | undefined): string {
  if (!email) return "—";
  const [local, domain] = email.split("@");
  if (!domain) return "—";
  if (local.length <= 2) return `${local[0]}***@${domain}`;
  return `${local.slice(0, 2)}***@${domain}`;
}

function fmtDate(d: Date | null | undefined): string {
  if (!d) return "—";
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Creator approval queue.
 *
 * Lists every creator stuck in PENDING + the recent decisions (last 10
 * approved/rejected) so the admin has visible history without leaving
 * the page.
 *
 * Each pending row shows the data the admin actually needs to decide:
 *   - Avatar (often a tell for fake / re-used accounts)
 *   - Display name + age computed from birth date (18+ floor sanity check)
 *   - Email (masked)
 *   - City + neighborhood, bio
 *   - Signup time (how long they've been waiting)
 *
 * Reject submits a textarea reason. Required by the action — empty
 * reasons would leave the queue muddy when the creator emails support
 * asking why their account is locked.
 */
export default async function CreatorsPendingPage() {
  const [pending, recent] = await Promise.all([
    prisma.creatorprofile.findMany({
      where: { status: "PENDING" },
      include: {
        user: { select: { email: true, emailVerified: true, createdAt: true } },
      },
      orderBy: { createdAt: "asc" }, // FIFO — oldest signups reviewed first
    }),
    prisma.creatorprofile.findMany({
      where: { status: { in: ["APPROVED", "REJECTED"] } },
      include: { user: { select: { email: true } } },
      orderBy: [{ approvedAt: "desc" }, { rejectedAt: "desc" }],
      take: 10,
    }),
  ]);

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="flex items-baseline justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Creator approval queue</h1>
          <p className="text-white/50 text-sm mt-1">
            New signups land here. Review the details, then approve or reject
            with a reason.
          </p>
        </div>
        <div className="flex gap-3 text-sm">
          <Link
            href="/admin/creators"
            className="text-white/60 hover:text-white underline underline-offset-4 decoration-white/20"
          >
            Verified creators →
          </Link>
          <Link
            href="/admin/subscriptions"
            className="text-white/60 hover:text-white underline underline-offset-4 decoration-white/20"
          >
            Subscriptions →
          </Link>
          <Link
            href="/admin/boosts"
            className="text-white/60 hover:text-white underline underline-offset-4 decoration-white/20"
          >
            Boosts →
          </Link>
        </div>
      </div>

      {/* PENDING QUEUE */}
      <section className="mb-10">
        <h2 className="text-sm font-bold uppercase tracking-widest text-white/40 mb-3">
          Pending — {pending.length}
        </h2>

        <div className="space-y-3">
          {pending.length === 0 && (
            <p className="text-white/50 text-sm">
              Inbox zero — no signups awaiting review.
            </p>
          )}

          {pending.map((c) => {
            const age = computeAge(c.birthDate ?? null);
            return (
              <div
                key={c.id}
                className="border border-white/10 rounded-xl p-4 bg-white/5"
              >
                <div className="flex gap-4">
                  <div className="h-16 w-16 shrink-0 rounded-full overflow-hidden bg-white/5 border border-white/8 relative">
                    {c.avatarUrl ? (
                      <Image
                        src={c.avatarUrl}
                        alt=""
                        fill
                        sizes="64px"
                        className="object-cover"
                        unoptimized={!c.avatarUrl.startsWith("https://res.cloudinary.com")}
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-xl text-white/30">
                        {c.displayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-base font-semibold">
                      {c.displayName}{" "}
                      {age != null && (
                        <span className="text-white/50 text-sm font-normal">
                          · {age}y
                        </span>
                      )}{" "}
                      <span className="text-white/30 text-xs font-normal">
                        #{c.id}
                      </span>
                    </p>
                    <p className="text-xs text-white/50 mt-0.5">
                      {maskEmail(c.user?.email)}
                      {c.user?.emailVerified ? (
                        <span className="text-emerald-400/80"> · email verified</span>
                      ) : (
                        <span className="text-amber-300/80"> · email NOT verified</span>
                      )}
                    </p>
                    <p className="text-xs text-white/40 mt-1">
                      Signed up {fmtDate(c.createdAt)}
                    </p>

                    <div className="mt-2 text-sm space-y-0.5">
                      <p>
                        <span className="text-white/40">Tier:</span>{" "}
                        <span className="text-white/80">{c.tier}</span>
                      </p>
                      <p>
                        <span className="text-white/40">Location:</span>{" "}
                        <span className="text-white/80">
                          {c.neighborhood ? `${c.neighborhood}, ` : ""}
                          {c.location ?? "—"}
                        </span>
                      </p>
                      {c.bio && (
                        <p className="text-white/65 mt-2 italic">
                          “{c.bio}”
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-4 flex flex-wrap gap-2">
                  <form action={approveCreator}>
                    <input
                      type="hidden"
                      name="creatorId"
                      value={c.id.toString()}
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg bg-emerald-600 text-sm font-semibold hover:bg-emerald-500 transition"
                    >
                      Approve
                    </button>
                  </form>

                  <form
                    action={rejectCreator}
                    className="flex-1 flex flex-wrap gap-2"
                  >
                    <input
                      type="hidden"
                      name="creatorId"
                      value={c.id.toString()}
                    />
                    <input
                      type="text"
                      name="reason"
                      placeholder="Reason for rejection (required)"
                      required
                      maxLength={500}
                      className="flex-1 min-w-[200px] rounded-lg bg-white/3 border border-white/10 px-3 py-2 text-sm placeholder:text-white/30 focus:outline-none focus:border-rose-500/50"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg border border-rose-500/40 text-rose-300 text-sm font-semibold hover:bg-rose-500/10 transition"
                    >
                      Reject
                    </button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* RECENT DECISIONS */}
      <section>
        <h2 className="text-sm font-bold uppercase tracking-widest text-white/40 mb-3">
          Recent decisions
        </h2>

        <div className="space-y-2">
          {recent.length === 0 && (
            <p className="text-white/40 text-sm">
              No history yet — your approvals + rejections will show here.
            </p>
          )}

          {recent.map((c) => {
            const isApproved = c.status === "APPROVED";
            const ts = isApproved ? c.approvedAt : c.rejectedAt;
            return (
              <div
                key={c.id}
                className="border border-white/8 rounded-lg p-3 bg-white/3 text-sm flex items-start gap-3"
              >
                <span
                  className={`mt-0.5 inline-block w-2 h-2 rounded-full flex-shrink-0 ${
                    isApproved ? "bg-emerald-400" : "bg-rose-400"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p>
                    <strong>{c.displayName}</strong>{" "}
                    <span className="text-white/40 text-xs">
                      #{c.id} · {maskEmail(c.user?.email)}
                    </span>
                  </p>
                  <p className="text-xs text-white/50 mt-0.5">
                    {isApproved ? "Approved" : "Rejected"} · {fmtDate(ts ?? null)}
                  </p>
                  {!isApproved && c.rejectionReason && (
                    <p className="text-xs text-rose-300/80 mt-1 italic">
                      “{c.rejectionReason}”
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
