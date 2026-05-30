import { redirect } from "next/navigation";

// The previous /explore page rendered static demo creators from
// data/creators.ts (the single fictional "Luna Sparks" record), which
// diverged from the real Prisma-backed homepage. Discovery now happens
// through the homepage's city drawer; this route preserves any existing
// inbound links by forwarding to the homepage with the city preselected.
export default async function ExploreRedirect({
  searchParams,
}: {
  searchParams: Promise<{ city?: string }>;
}) {
  const { city } = await searchParams;
  redirect(city ? `/?city=${encodeURIComponent(city)}` : "/");
}
