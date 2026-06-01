import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const BASE = "https://midnight24.cam";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static pages
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE, changeFrequency: "daily", priority: 1.0 },
    { url: `${BASE}/feed`, changeFrequency: "hourly", priority: 0.9 },
    { url: `${BASE}/upgrade`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE}/become-a-member`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${BASE}/safety`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${BASE}/privacy`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${BASE}/terms`, changeFrequency: "monthly", priority: 0.3 },
  ];

  // Dynamic creator profiles — only APPROVED creators
  const creators = await prisma.creatorprofile.findMany({
    where: { status: "APPROVED" },
    select: { id: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
    take: 1000, // cap so sitemap stays under 50k URL limit
  });

  const creatorRoutes: MetadataRoute.Sitemap = creators.map((c) => ({
    url: `${BASE}/creator/${c.id}`,
    lastModified: c.updatedAt,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticRoutes, ...creatorRoutes];
}
