// app/admin/subscriptions/page.tsx
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { approveSubscription } from "./server-actions";

export default async function AdminSubscriptionsPage() {
  const session = (await auth()) as {
      user?: {
        id?: string;
        role?: string;
        email?: string;
        name?: string;
      };
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
        include: { user: true },
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

        {subs.map((sub) => (
          <div
            key={sub.id}
            className="border border-white/10 rounded-xl p-4 bg-white/5"
          >
            <p><strong>Email:</strong> {sub.creatorProfile.user?.email}</p>
            <p><strong>Plan:</strong> {sub.plan}</p>
            <p><strong>Provider:</strong> {sub.provider}</p>
            <p><strong>Amount:</strong> {sub.amountCfa} CFA</p>
            <p><strong>Phone:</strong> {sub.phoneNumber || "N/A"}</p>

            {sub.screenshotUrl && (
              <img
                src={sub.screenshotUrl}
                alt="payment proof"
                className="mt-3 rounded-lg max-h-40 border border-white/10"
              />
            )}

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
        ))}
      </div>
    </div>
  );
}