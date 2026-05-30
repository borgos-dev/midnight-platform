import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { GrantForm } from "./GrantForm";
// Void-returning form wrappers — the underlying actions return a Result
// object the client GrantForm consumes; these strip it so the inline
// <form action={...}> bindings below typecheck against React's
// void-only form-action contract.
import {
  cancelFoundingGrantForm,
  changeFoundingGrantTierForm,
} from "./actions";
import {
  Crown,
  Diamond,
  Star,
  Circle,
  ShieldCheck,
  XCircle,
} from "lucide-react";

// Plan codes we can switch between via the inline tier-change buttons.
// Keeps the row layout deterministic — we always render two "Change to"
// buttons (one for each tier that isn't the current one).
const ALL_PLANS = ["PREMIUM", "VIP", "VIP_PLUS"] as const;
const PLAN_LABEL: Record<(typeof ALL_PLANS)[number], string> = {
  PREMIUM: "Premium",
  VIP: "VIP",
  VIP_PLUS: "VIP+",
};

export const dynamic = "force-dynamic";

function fmt(d: Date | null | undefined): string {
  if (!d) return "—";
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const TIER_ACCENT: Record<string, { color: string; Icon: typeof Crown }> = {
  VIP_PLUS: { color: "#E6A817", Icon: Crown },
  VIP: { color: "#a855f7", Icon: Diamond },
  PREMIUM: { color: "#E8547A", Icon: Star },
  REGULAR: { color: "#6A6A9A", Icon: Circle },
};

/**
 * Founding-creator admin tool.
 *
 * Three sections:
 *   1. Grant form — pick a creator, tier, duration. Server action handles
 *      the rest (creates a $0 ACTIVE subscription, flips creator.tier).
 *   2. Eligible creators — quick reference of who you *can* grant to
 *      (anyone without a live paid sub).
 *   3. Active founding grants — currently-running free passes for audit
 *      + so you don't double-grant.
 *
 * Founding grants reuse the Subscription table with amountCfa=0 and
 * phoneNumber="FOUNDING_GRANT" as the marker. This means the existing
 * tier-expiry sweep auto-downgrades founding creators on day N+1
 * without any new code paths.
 */
export default async function AdminFoundingCreatorsPage() {
  const now = new Date();

  // Eligible creators: any approved or pending creator who doesn't
  // currently have a live (non-expired, non-cancelled) subscription.
  const allCreators = await prisma.creatorprofile.findMany({
    where: {
      status: { in: ["APPROVED", "PENDING"] },
    },
    select: {
      id: true,
      displayName: true,
      tier: true,
      verified: true,
      user: { select: { email: true } },
      subscriptions: {
        where: {
          status: { in: ["PENDING", "PAID"] },
          endsAt: { gt: now },
        },
        select: { id: true },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const eligible = allCreators
    .filter((c) => c.subscriptions.length === 0)
    .map((c) => ({
      id: c.id,
      displayName: c.displayName,
      email: c.user?.email ?? "—",
      currentTier: c.tier,
      verified: c.verified,
    }));

  // Active founding grants — the phoneNumber marker lets us filter to
  // promo rows without sweeping every paid subscription. Newest first
  // so the most recent decisions are at the top of the audit panel.
  const activeGrants = await prisma.subscription.findMany({
    where: {
      status: "PAID",
      amountCfa: 0,
      phoneNumber: "FOUNDING_GRANT",
      endsAt: { gt: now },
    },
    include: {
      creatorProfile: {
        select: {
          id: true,
          displayName: true,
          tier: true,
          user: { select: { email: true } },
        },
      },
    },
    orderBy: { startsAt: "desc" },
    take: 30,
  });

  return (
    <div className="min-h-screen bg-black text-white p-6 lg:p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Founding creators</h1>
        <p className="text-white/50 text-sm mt-1 leading-relaxed max-w-2xl">
          Grant free paid-tier access to bootstrap the platform. Creates a $0
          subscription that uses every existing tier-resolution + expiry
          code path — when the grant ends, the creator auto-downgrades to
          Regular like any expired paid subscription.
        </p>
      </header>

      <div className="grid lg:grid-cols-[1fr,1.4fr] gap-6">
        {/* LEFT — the form */}
        <GrantForm creators={eligible} />

        {/* RIGHT — active grants list */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold uppercase tracking-widest text-white/40">
              Active grants — {activeGrants.length}
            </h2>
          </div>

          {activeGrants.length === 0 && (
            <div className="rounded-xl border border-white/8 bg-white/3 p-5 text-sm text-white/45">
              No active founding grants yet. The first one you create lands
              here.
            </div>
          )}

          <div className="space-y-2">
            {activeGrants.map((g) => {
              const accent =
                TIER_ACCENT[g.plan] ?? TIER_ACCENT.REGULAR;
              const Icon = accent.Icon;
              const daysLeft = Math.max(
                0,
                Math.ceil(
                  (g.endsAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
                ),
              );
              // Tier-change targets — every tier except the current one.
              // Rendered as two small forms below the row so admin can fix
              // a wrong-tier grant in one click without modal noise.
              const otherTiers = ALL_PLANS.filter((p) => p !== g.plan);
              return (
                <div
                  key={g.id}
                  className="rounded-xl border border-white/8 bg-white/3 p-3 flex flex-col gap-3"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
                      style={{ background: `${accent.color}22` }}
                    >
                      <Icon
                        size={15}
                        strokeWidth={2.3}
                        style={{ color: accent.color }}
                      />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">
                        <Link
                          href={`/creator/${g.creatorProfile?.id ?? ""}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline underline-offset-4 decoration-white/40"
                        >
                          {g.creatorProfile?.displayName ?? "—"}
                        </Link>{" "}
                        <span className="font-normal text-white/35 text-xs">
                          #{g.creatorProfile?.id ?? "?"}
                        </span>
                      </p>
                      <p className="text-xs text-white/50 mt-0.5">
                        {g.creatorProfile?.user?.email ?? "—"}
                      </p>
                      <p className="text-[11px] text-white/45 mt-1">
                        <strong className="text-white/75">{g.plan}</strong> ·{" "}
                        ends {fmt(g.endsAt)} · {daysLeft} day
                        {daysLeft === 1 ? "" : "s"} left
                      </p>
                    </div>
                  </div>

                  {/* Amendment actions — change tier or cancel. End date
                      is preserved on tier change; cancel ends immediately. */}
                  <div className="flex flex-wrap gap-1.5 pt-2 border-t border-white/5">
                    {otherTiers.map((target) => (
                      <form action={changeFoundingGrantTierForm} key={target}>
                        <input
                          type="hidden"
                          name="subscriptionId"
                          value={g.id.toString()}
                        />
                        <input type="hidden" name="plan" value={target} />
                        <button
                          type="submit"
                          className="rounded-md border border-white/10 bg-white/5 hover:bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/70 hover:text-white transition"
                        >
                          → {PLAN_LABEL[target]}
                        </button>
                      </form>
                    ))}
                    <form
                      action={cancelFoundingGrantForm}
                      className="ml-auto"
                    >
                      <input
                        type="hidden"
                        name="subscriptionId"
                        value={g.id.toString()}
                      />
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1 rounded-md border border-rose-500/30 bg-rose-500/8 hover:bg-rose-500/15 px-2.5 py-1 text-[11px] font-semibold text-rose-200 transition"
                      >
                        <XCircle size={11} strokeWidth={2.3} />
                        Cancel
                      </button>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 rounded-lg border border-white/8 bg-white/3 p-3 flex items-start gap-2.5 text-[11px] text-white/55 leading-relaxed">
            <ShieldCheck
              size={13}
              strokeWidth={2.2}
              className="mt-0.5 text-white/40 shrink-0"
            />
            <p>
              Founding grants are logged to the audit trail as
              <code className="text-white/75"> SUBSCRIPTION_APPROVED </code>
              with <code className="text-white/75">foundingGrant: true</code>{" "}
              in the metadata. Filter the audit log by that flag to see who
              granted what.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
