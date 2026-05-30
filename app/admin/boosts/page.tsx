import { prisma } from "@/lib/prisma";
import { expireDueBoosts } from "@/app/lib/boost-lifecycle";
import { approveBoost, rejectBoost } from "./actions";

export const dynamic = "force-dynamic";

function maskEmail(email: string | null | undefined): string {
  if (!email) return "—";
  const [local, domain] = email.split("@");
  if (!domain) return "—";
  if (local.length <= 2) return `${local[0]}***@${domain}`;
  return `${local.slice(0, 2)}***@${domain}`;
}

function fmt(d: Date | null): string {
  return d
    ? d.toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";
}

export default async function AdminBoostsPage() {
  // Expire anything overdue before painting the queue, so admins see an
  // accurate state without having to refresh twice.
  await expireDueBoosts();

  const [pending, active] = await Promise.all([
    prisma.boost.findMany({
      where: { status: "PENDING_REVIEW" },
      include: {
        creatorprofile: {
          select: {
            id: true,
            displayName: true,
            user: { select: { email: true } },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.boost.findMany({
      where: { status: "ACTIVE" },
      include: {
        creatorprofile: {
          select: { id: true, displayName: true },
        },
      },
      orderBy: { endsAt: "asc" },
    }),
  ]);

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <h1 className="text-2xl font-semibold mb-2">Boost Approvals</h1>
      <p className="text-white/50 text-sm mb-6">
        Verify the WhatsApp screenshot matches the boost row, then approve.
        Approving creates the Ad row immediately and starts the clock.
      </p>

      {/* Pending review */}
      <section className="mb-10">
        <h2 className="text-sm font-bold uppercase tracking-widest text-white/40 mb-3">
          Pending review — {pending.length}
        </h2>
        <div className="space-y-3">
          {pending.length === 0 && (
            <p className="text-white/50 text-sm">Nothing waiting.</p>
          )}

          {pending.map((b) => (
            <div
              key={b.id}
              className="border border-white/10 rounded-xl p-4 bg-white/5"
            >
              <p>
                <strong>Creator:</strong> {b.creatorprofile.displayName} (#
                {b.creatorprofile.id})
              </p>
              <p>
                <strong>Email:</strong>{" "}
                {maskEmail(b.creatorprofile.user?.email)}
              </p>
              <p>
                <strong>Duration:</strong> {b.durationDays} days
              </p>
              <p>
                <strong>Amount:</strong> {b.amountCfa.toLocaleString()} CFA
              </p>
              <p>
                <strong>Provider:</strong>{" "}
                {b.provider === "MTN_MOMO" ? "MTN MoMo" : "Orange Money"}
              </p>
              <p>
                <strong>Phone used:</strong> {b.phoneNumber || "—"}
              </p>
              <p>
                <strong>Submitted:</strong> {fmt(b.createdAt)}
              </p>

              <div className="mt-4 flex gap-2">
                <form action={approveBoost}>
                  <input
                    type="hidden"
                    name="boostId"
                    value={b.id.toString()}
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-purple-600 text-sm font-semibold hover:bg-purple-500 transition"
                  >
                    Approve &amp; create ad
                  </button>
                </form>

                <form action={rejectBoost}>
                  <input
                    type="hidden"
                    name="boostId"
                    value={b.id.toString()}
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg border border-white/15 text-sm font-medium text-white/70 hover:text-white hover:border-white/30 transition"
                  >
                    Reject
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Active boosts */}
      <section>
        <h2 className="text-sm font-bold uppercase tracking-widest text-white/40 mb-3">
          Active — {active.length}
        </h2>
        <div className="space-y-3">
          {active.length === 0 && (
            <p className="text-white/50 text-sm">No active boosts right now.</p>
          )}

          {active.map((b) => (
            <div
              key={b.id}
              className="border border-white/10 rounded-xl p-4 bg-white/5"
            >
              <p>
                <strong>Creator:</strong> {b.creatorprofile.displayName} (#
                {b.creatorprofile.id})
              </p>
              <p>
                <strong>Started:</strong> {fmt(b.startsAt)}
              </p>
              <p>
                <strong>Ends:</strong> {fmt(b.endsAt)}
              </p>
              <p>
                <strong>Ad ID:</strong> {b.adId ?? "—"}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
