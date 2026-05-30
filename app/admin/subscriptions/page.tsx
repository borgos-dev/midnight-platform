// app/admin/subscriptions/page.tsx
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { approveSubscription } from "./server-actions";

const ALLOWED_SCREENSHOT_HOSTS = new Set<string>([
  "res.cloudinary.com",
]);

function maskEmail(email: string | null | undefined): string {
  if (!email) return "—";
  const [local, domain] = email.split("@");
  if (!domain) return "—";
  if (local.length <= 2) return `${local[0]}***@${domain}`;
  return `${local.slice(0, 2)}***@${domain}`;
}

function isSafeScreenshotUrl(raw: string | null | undefined): boolean {
  if (!raw) return false;
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:") return false;
    return ALLOWED_SCREENSHOT_HOSTS.has(u.host);
  } catch {
    return false;
  }
}

export default async function AdminSubscriptionsPage() {
  const session = (await auth()) as {
    user?: { id?: string; role?: string; email?: string; name?: string };
  };

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/");
  }

  const subs = await prisma.subscription.findMany({
    where: { status: "PENDING" },
    include: {
      creatorProfile: {
        select: {
          id: true,
          displayName: true,
          user: { select: { id: true, email: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <h1 className="text-2xl font-semibold mb-6">Pending Payments</h1>

      <div className="space-y-4">
        {subs.length === 0 && (
          <p className="text-white/60">No pending subscriptions.</p>
        )}

        {subs.map((sub) => {
          const safeScreenshot = isSafeScreenshotUrl(sub.screenshotUrl);
          return (
            <div
              key={sub.id}
              className="border border-white/10 rounded-xl p-4 bg-white/5"
            >
              <p>
                <strong>Creator:</strong> {sub.creatorProfile.displayName} (#{sub.creatorProfile.id})
              </p>
              <p>
                <strong>Email:</strong> {maskEmail(sub.creatorProfile.user?.email)}
              </p>
              <p><strong>Plan:</strong> {sub.plan}</p>
              <p><strong>Provider:</strong> {sub.provider}</p>
              <p><strong>Amount:</strong> {sub.amountCfa} CFA</p>
              <p><strong>Phone:</strong> {sub.phoneNumber || "N/A"}</p>

              {safeScreenshot ? (
                <img
                  src={sub.screenshotUrl!}
                  alt="payment proof"
                  className="mt-3 rounded-lg max-h-40 border border-white/10"
                />
              ) : sub.screenshotUrl ? (
                <p className="mt-3 text-xs text-red-400">
                  Screenshot URL rejected (must be on res.cloudinary.com).
                </p>
              ) : null}

              <form action={approveSubscription} className="mt-4 inline-flex">
                <input type="hidden" name="subscriptionId" value={sub.id.toString()} />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-purple-600 text-sm font-semibold hover:bg-purple-500 transition"
                >
                  Mark as Paid
                </button>
              </form>
            </div>
          );
        })}
      </div>
    </div>
  );
}
