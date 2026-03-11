// app/dashboard/page.tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "./DashboardShell";
import { enforceSubscriptionStatus } from "@/app/lib/subscription";
import { AccessLevel } from "@prisma/client";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const userId = Number(session.user.id);

  // 1. Enforce subscription expiry
  await enforceSubscriptionStatus(userId);

  // 2. Fetch creator with recent posts + media + likes
  const creator = await prisma.creatorprofile.findUnique({
    where: { userId },
    include: {
      post: {
        include: { media: true, likes: true },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });

  if (!creator) {
    redirect("/");
  }

  const tier = creator.tier as AccessLevel;

  // 3. Real analytics from DB columns — zero fake numbers
  const viewsToday = creator.profileViewsToday ?? 0;
  const viewsWeek = creator.profileViewsWeek ?? 0;
  const viewsMonth = creator.profileViewsMonth ?? 0;
  const clicksToday = creator.whatsappClicksToday ?? 0;
  const clicksWeek = creator.whatsappClicksWeek ?? 0;
  const clicksMonth = creator.whatsappClicksMonth ?? 0;

  // Compute real conversion rate from week data (safe div)
  const computedCTR =
    creator.whatsappCTR !== null && creator.whatsappCTR !== undefined
      ? creator.whatsappCTR
      : viewsWeek > 0
      ? Math.round((clicksWeek / viewsWeek) * 1000) / 10
      : null;

  // City rank: count creators in same location with more weekly views
  let cityRank: number | null = null;
  if (creator.location && tier === "VIP_PLUS") {
    const higherCount = await prisma.creatorprofile.count({
      where: {
        location: creator.location,
        profileViewsWeek: { gt: viewsWeek },
        status: "APPROVED",
      },
    });
    cityRank = higherCount + 1;
  }

  const analytics = {
    profileViewsToday: viewsToday,
    profileViewsWeek: viewsWeek,
    profileViewsMonth: viewsMonth,
    whatsappClicksToday: clicksToday,
    whatsappClicksWeek: clicksWeek,
    whatsappClicksMonth: clicksMonth,
    conversionRate: computedCTR,
    cityRank,
    bestDay: creator.bestDay ?? null,
    bestTime: creator.bestTime ?? null,
  };

  // 4. Shape top posts — sorted by real likes count, no random numbers
  const topPosts = creator.post
    .map((p) => {
      const firstMedia = p.media[0];
      return {
        id: p.id,
        title: p.title,
        accessLevel: p.accessLevel,
        thumbnail: firstMedia?.filePath ?? null,
        mediaKind: firstMedia?.kind ?? null,
        likes: p.likes.length,
      };
    })
    .sort((a, b) => b.likes - a.likes)
    .slice(0, 3);

  return (
    <DashboardShell
      tier={tier}
      name={creator.displayName ?? "Creator"}
      avatarUrl={creator.avatarUrl ?? null}
      location={creator.location ?? null}
      creatorId={creator.id}
      analytics={analytics}
      topPosts={topPosts}
    />
  );
}