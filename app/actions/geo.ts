// app/actions/geo.ts
"use server";

import { redirect } from "next/navigation";
import { setGeoOptOut } from "@/app/lib/geolocation";

/**
 * Visitor pressed "Show all cities" on the auto-detection banner.
 * We persist their preference (so the next visit doesn't re-auto-filter)
 * and redirect to the unfiltered homepage.
 */
export async function clearGeoFilter() {
  await setGeoOptOut();
  redirect("/");
}
