import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  approveReviewCommentForm,
  rejectReviewCommentForm,
  hideReviewForm,
} from "@/app/actions/moderateReview";
import { RatingStars } from "@/app/components/creator/RatingStars";
import { CircleCheckBig, CircleX, EyeOff, MessageSquareText } from "lucide-react";

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

const STATUS_LABELS: Record<string, string> = {
  COMMENT_APPROVED: "Comment approved",
  COMMENT_REJECTED: "Comment rejected",
  HIDDEN: "Hidden",
  LIVE: "Star live",
};

/**
 * Review moderation queue.
 *
 * The platform runs hybrid moderation: a visitor's star counts toward the
 * average the instant it's submitted (status LIVE) but their comment text
 * stays hidden from the public profile until an admin approves it. The two
 * sections below mirror that split:
 *
 *   1. Pending — reviews with status LIVE and a non-null comment that
 *      hasn't been decided on yet. Admin picks approve / reject / hide.
 *   2. Recently moderated — last 12 decisions for audit visibility.
 *
 * Reviews with status LIVE + no comment never appear here because there
 * is nothing to moderate (the star itself is permitted automatically).
 */
export default async function AdminReviewsPage() {
  const pending = await prisma.review.findMany({
    where: {
      status: "LIVE",
      comment: { not: null },
    },
    include: {
      creatorprofile: {
        select: { id: true, displayName: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const recent = await prisma.review.findMany({
    where: { status: { not: "LIVE" } },
    include: {
      creatorprofile: { select: { id: true, displayName: true } },
    },
    orderBy: { moderatedAt: "desc" },
    take: 12,
  });

  return (
    <div className="min-h-screen bg-black text-white p-6 lg:p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Review moderation</h1>
        <p className="text-white/50 text-sm mt-1">
          Visitor stars go live immediately and already count in each
          creator's public average. Only the optional comment text waits
          here for your decision.
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
              No comments waiting. Stars from new reviews land in the
              creator average automatically.
            </p>
          )}

          {pending.map((r) => (
            <div
              key={r.id}
              className="rounded-xl p-4 border border-white/10 bg-white/5"
            >
              <div className="flex items-baseline justify-between gap-3 mb-3 flex-wrap">
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
                </p>
                <p className="text-xs text-white/40">
                  Filed {fmt(r.createdAt)}
                </p>
              </div>

              <div className="flex items-center gap-3 mb-3">
                <RatingStars rating={r.rating} size={14} />
                <span className="text-xs text-white/45">
                  Visitor #{r.visitorId.slice(0, 8)}…
                </span>
              </div>

              <div className="rounded-lg border border-white/8 bg-black/30 p-3 mb-4">
                <p className="text-[10px] font-bold tracking-[0.10em] text-white/40 mb-1 flex items-center gap-1.5">
                  <MessageSquareText size={11} strokeWidth={2.4} />
                  COMMENT
                </p>
                <p className="text-sm whitespace-pre-wrap text-white/85 leading-relaxed">
                  {r.comment}
                </p>
              </div>

              {/* Three decision forms. All take the same reviewId hidden
                  input — the server action's status is encoded in which
                  endpoint the form posts to. */}
              <div className="grid sm:grid-cols-3 gap-2">
                <form action={approveReviewCommentForm}>
                  <input
                    type="hidden"
                    name="reviewId"
                    value={r.id.toString()}
                  />
                  <button
                    type="submit"
                    className="w-full rounded-md bg-emerald-600 hover:bg-emerald-500 px-3 py-2 text-xs font-semibold transition flex items-center justify-center gap-1.5"
                  >
                    <CircleCheckBig size={13} strokeWidth={2.4} />
                    Approve comment
                  </button>
                </form>

                <form action={rejectReviewCommentForm}>
                  <input
                    type="hidden"
                    name="reviewId"
                    value={r.id.toString()}
                  />
                  <button
                    type="submit"
                    className="w-full rounded-md border border-amber-500/40 text-amber-300 hover:bg-amber-500/10 px-3 py-2 text-xs font-semibold transition flex items-center justify-center gap-1.5"
                  >
                    <CircleX size={13} strokeWidth={2.4} />
                    Reject (star stays)
                  </button>
                </form>

                <form action={hideReviewForm}>
                  <input
                    type="hidden"
                    name="reviewId"
                    value={r.id.toString()}
                  />
                  <button
                    type="submit"
                    className="w-full rounded-md border border-rose-500/40 text-rose-300 hover:bg-rose-500/10 px-3 py-2 text-xs font-semibold transition flex items-center justify-center gap-1.5"
                  >
                    <EyeOff size={13} strokeWidth={2.4} />
                    Hide whole review
                  </button>
                </form>
              </div>
              <p className="mt-2 text-[11px] text-white/40 leading-relaxed">
                Approve: comment goes live on the profile. Reject: comment
                stays hidden but the star keeps counting. Hide: pulls the
                whole row, star included.
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* RECENT */}
      <section>
        <h2 className="text-sm font-bold uppercase tracking-widest text-white/40 mb-3">
          Recently moderated
        </h2>
        <div className="rounded-xl border border-white/10 bg-white/3 divide-y divide-white/8">
          {recent.length === 0 && (
            <div className="p-4 text-sm text-white/40">
              No decisions logged yet.
            </div>
          )}
          {recent.map((r) => {
            const icon =
              r.status === "COMMENT_APPROVED" ? (
                <CircleCheckBig
                  size={16}
                  className="text-emerald-400 mt-0.5"
                  strokeWidth={2.2}
                />
              ) : r.status === "COMMENT_REJECTED" ? (
                <CircleX
                  size={16}
                  className="text-amber-400 mt-0.5"
                  strokeWidth={2.2}
                />
              ) : (
                <EyeOff
                  size={16}
                  className="text-rose-400 mt-0.5"
                  strokeWidth={2.2}
                />
              );
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
                      #{r.creatorprofile?.id ?? "?"} ·{" "}
                      {STATUS_LABELS[r.status] ?? r.status}
                    </span>
                  </p>
                  <p className="text-xs text-white/45 mt-0.5">
                    {fmt(r.moderatedAt)} · {r.rating}★
                  </p>
                  {r.status === "COMMENT_APPROVED" && r.comment && (
                    <p className="text-xs text-white/55 italic mt-1 line-clamp-2">
                      “{r.comment}”
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
