import Link from "next/link";
import {
  UserCheck,
  CreditCard,
  TrendingUp,
  Flag,
  ChevronRight,
  CircleCheckBig,
  CircleX,
} from "lucide-react";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function fmtDate(d: Date | null | undefined): string {
  if (!d) return "—";
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Admin dashboard home.
 *
 * Shows every queue that needs attention with live counts so the admin
 * never has to memorize URLs to find work. Two columns of data:
 *   - QUEUES (top): action items grouped by type, with counts. Each row
 *     links to the dedicated queue page.
 *   - STATS (right): platform-level numbers (total approved creators,
 *     today's signups, etc.) so the admin has context at a glance.
 *
 * Then a feed of recent decisions across queues — a "what happened
 * lately" timeline. Useful when an admin returns after a few days off
 * and wants to see what a co-admin did. Currently we only have one
 * admin pattern, but the audit columns are already populated so the
 * timeline scales with team size.
 */
export default async function AdminHome() {
  const [
    pendingCreators,
    pendingSubscriptions,
    pendingBoosts,
    pendingReports,
    activeBoosts,
    totalApprovedCreators,
    totalVerified,
    todaySignups,
    recentCreatorDecisions,
  ] = await Promise.all([
    prisma.creatorprofile.count({ where: { status: "PENDING" } }),
    prisma.subscription.count({ where: { status: "PENDING" } }),
    prisma.boost.count({ where: { status: "PENDING_REVIEW" } }),
    prisma.report.count({ where: { status: "PENDING_REVIEW" } }),
    prisma.boost.count({ where: { status: "ACTIVE" } }),
    prisma.creatorprofile.count({ where: { status: "APPROVED" } }),
    prisma.creatorprofile.count({ where: { verified: true, status: "APPROVED" } }),
    prisma.creatorprofile.count({
      where: {
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    }),
    prisma.creatorprofile.findMany({
      where: { status: { in: ["APPROVED", "REJECTED"] } },
      include: { user: { select: { email: true } } },
      orderBy: [{ approvedAt: "desc" }, { rejectedAt: "desc" }],
      take: 6,
    }),
  ]);

  const queues: {
    title: string;
    count: number;
    href: string;
    icon: React.ReactNode;
    accent: "amber" | "purple" | "emerald" | "rose";
    blurb: string;
  }[] = [
    {
      title: "Creator approvals",
      count: pendingCreators,
      href: "/admin/creators-pending",
      icon: <UserCheck size={18} strokeWidth={2.2} />,
      accent: "amber",
      blurb: "New signups awaiting your review",
    },
    {
      title: "Subscription payments",
      count: pendingSubscriptions,
      href: "/admin/subscriptions",
      icon: <CreditCard size={18} strokeWidth={2.2} />,
      accent: "purple",
      blurb: "VIP / VIP+ payment proofs to verify",
    },
    {
      title: "Boost payments",
      count: pendingBoosts,
      href: "/admin/boosts",
      icon: <TrendingUp size={18} strokeWidth={2.2} />,
      accent: "rose",
      blurb: "Regular-tier boost proofs to verify",
    },
    {
      title: "Content reports",
      count: pendingReports,
      href: "/admin/reports",
      icon: <Flag size={18} strokeWidth={2.2} />,
      accent: "rose",
      blurb: "Visitor flags on profiles — urgent first",
    },
  ];

  const stats: { label: string; value: string | number }[] = [
    { label: "Approved creators", value: totalApprovedCreators },
    { label: "Verified creators", value: totalVerified },
    { label: "Active boosts", value: activeBoosts },
    { label: "Signups today", value: todaySignups },
  ];

  return (
    <div className="min-h-screen bg-black text-white p-6 lg:p-8">
      <div className="max-w-5xl">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold">Admin dashboard</h1>
          <p className="text-white/50 text-sm mt-1">
            Everything that needs your attention, in one view.
          </p>
        </header>

        {/* QUEUES */}
        <section className="mb-10">
          <h2 className="text-sm font-bold uppercase tracking-widest text-white/40 mb-3">
            Queues
          </h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {queues.map((q) => (
              <Link
                key={q.title}
                href={q.href}
                className={`group block rounded-xl p-4 border transition ${
                  q.count > 0
                    ? `bg-${q.accent}-500/8 border-${q.accent}-500/30 hover:border-${q.accent}-400/60`
                    : "bg-white/5 border-white/10 hover:border-white/20"
                }`}
                style={
                  q.count > 0
                    ? {
                        // Tailwind's dynamic class names can't be JIT-detected
                        // when accent is a variable, so the visible colour
                        // lives in inline style. The class names above keep
                        // any future-tailwind purges happy when accents are
                        // static.
                        background:
                          q.accent === "amber"
                            ? "rgba(245, 158, 11, 0.08)"
                            : q.accent === "purple"
                              ? "rgba(168, 85, 247, 0.08)"
                              : q.accent === "rose"
                                ? "rgba(232, 84, 122, 0.08)"
                                : "rgba(16, 185, 129, 0.08)",
                        borderColor:
                          q.accent === "amber"
                            ? "rgba(245, 158, 11, 0.3)"
                            : q.accent === "purple"
                              ? "rgba(168, 85, 247, 0.3)"
                              : q.accent === "rose"
                                ? "rgba(232, 84, 122, 0.3)"
                                : "rgba(16, 185, 129, 0.3)",
                      }
                    : undefined
                }
              >
                <div className="flex items-start justify-between gap-3">
                  <div
                    className="inline-flex items-center justify-center w-9 h-9 rounded-lg"
                    style={{
                      background:
                        q.count > 0
                          ? q.accent === "amber"
                            ? "rgba(245, 158, 11, 0.18)"
                            : q.accent === "purple"
                              ? "rgba(168, 85, 247, 0.18)"
                              : q.accent === "rose"
                                ? "rgba(232, 84, 122, 0.18)"
                                : "rgba(16, 185, 129, 0.18)"
                          : "rgba(255, 255, 255, 0.06)",
                      color:
                        q.count > 0
                          ? q.accent === "amber"
                            ? "#f59e0b"
                            : q.accent === "purple"
                              ? "#a855f7"
                              : q.accent === "rose"
                                ? "#E8547A"
                                : "#10b981"
                          : "rgba(255, 255, 255, 0.4)",
                    }}
                  >
                    {q.icon}
                  </div>
                  <span
                    className="text-2xl font-bold tabular-nums"
                    style={{
                      color:
                        q.count > 0
                          ? q.accent === "amber"
                            ? "#fbbf24"
                            : q.accent === "purple"
                              ? "#c084fc"
                              : q.accent === "rose"
                                ? "#f472a8"
                                : "#34d399"
                          : "rgba(255, 255, 255, 0.5)",
                    }}
                  >
                    {q.count}
                  </span>
                </div>
                <p className="mt-3 font-semibold">{q.title}</p>
                <p className="text-xs text-white/55 mt-0.5 leading-snug">
                  {q.blurb}
                </p>
                <span className="mt-3 inline-flex items-center gap-1 text-xs text-white/50 group-hover:text-white transition">
                  Open queue
                  <ChevronRight size={12} strokeWidth={2.5} />
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* STATS */}
        <section className="mb-10">
          <h2 className="text-sm font-bold uppercase tracking-widest text-white/40 mb-3">
            Platform at a glance
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {stats.map((s) => (
              <div
                key={s.label}
                className="rounded-xl p-4 bg-white/4 border border-white/8"
              >
                <p className="text-2xl font-bold tabular-nums">{s.value}</p>
                <p className="text-xs text-white/55 mt-1 uppercase tracking-wider">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* RECENT ACTIVITY */}
        <section>
          <h2 className="text-sm font-bold uppercase tracking-widest text-white/40 mb-3">
            Recent decisions
          </h2>
          <div className="rounded-xl border border-white/10 bg-white/3 divide-y divide-white/8">
            {recentCreatorDecisions.length === 0 && (
              <div className="p-4 text-sm text-white/50">
                No decisions yet — your approvals + rejections show here.
              </div>
            )}
            {recentCreatorDecisions.map((c) => {
              const isApproved = c.status === "APPROVED";
              const ts = isApproved ? c.approvedAt : c.rejectedAt;
              return (
                <div key={c.id} className="p-4 flex items-start gap-3 text-sm">
                  {isApproved ? (
                    <CircleCheckBig
                      size={18}
                      className="text-emerald-400 flex-shrink-0 mt-0.5"
                      strokeWidth={2.2}
                    />
                  ) : (
                    <CircleX
                      size={18}
                      className="text-rose-400 flex-shrink-0 mt-0.5"
                      strokeWidth={2.2}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p>
                      <strong>{c.displayName}</strong>{" "}
                      <span className="text-white/35 text-xs">
                        #{c.id} · {c.user?.email ?? "—"}
                      </span>
                    </p>
                    <p className="text-xs text-white/45 mt-0.5">
                      {isApproved ? "Approved" : "Rejected"} ·{" "}
                      {fmtDate(ts ?? null)}
                    </p>
                    {!isApproved && c.rejectionReason && (
                      <p className="text-xs text-rose-300/75 italic mt-1">
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
    </div>
  );
}

