import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Keep admin + dashboard + API routes out of search indexes
        disallow: [
          "/admin/",
          "/dashboard/",
          "/api/",
          "/upgrade/checkout",
          "/upgrade/proof",
          "/boost/proof",
          "/verify-email",
          "/reset-password",
          "/forgot-password",
        ],
      },
    ],
    sitemap: "https://midnight24.cam/sitemap.xml",
  };
}
