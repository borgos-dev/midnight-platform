import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AdminSidebar } from "./AdminSidebar";

/**
 * /admin layout — auth gate + persistent sidebar shell.
 *
 * Three jobs:
 *   1. Bounce unauthenticated visitors to /login
 *   2. Bounce non-admin users to /dashboard (their natural surface)
 *   3. Render the AdminSidebar alongside the page content with live
 *      queue counts so admins can navigate without typing URLs
 *
 * Counts are fetched once per request inside this layout — the sidebar
 * itself is a client component so it can handle the mobile drawer state,
 * but the data fetch stays server-side for security + freshness.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // 1. Not logged in → /login
  if (!session?.user?.email) {
    redirect("/login");
  }

  // 2. Logged in but not an admin → /dashboard
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { role: true, name: true, email: true },
  });
  if (user?.role !== "ADMIN") {
    redirect("/dashboard");
  }

  // 3. Live queue counts for the sidebar badges. Five small COUNT
  // queries in parallel — indexed lookups, cheap, no caching needed.
  // Reviews badge counts review rows with a comment still awaiting a
  // decision (status LIVE + a non-null comment) so admins see the
  // hybrid-moderation backlog at a glance.
  const [
    pendingCreators,
    pendingSubscriptions,
    pendingBoosts,
    pendingReports,
    pendingReviews,
  ] = await Promise.all([
    prisma.creatorprofile.count({ where: { status: "PENDING" } }),
    prisma.subscription.count({ where: { status: "PENDING" } }),
    prisma.boost.count({ where: { status: "PENDING_REVIEW" } }),
    prisma.report.count({ where: { status: "PENDING_REVIEW" } }),
    prisma.review.count({
      where: { status: "LIVE", comment: { not: null } },
    }),
  ]);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col md:flex-row">
      <AdminSidebar
        counts={{
          pendingCreators,
          pendingSubscriptions,
          pendingBoosts,
          pendingReports,
          pendingReviews,
        }}
        adminName={user.name ?? user.email}
      />
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
