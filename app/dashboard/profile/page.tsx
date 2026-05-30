import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ProfileForm from "./ProfileForm";
import { ExternalLinksEditor } from "./ExternalLinksEditor";
import { MAX_LINKS_PER_CREATOR } from "./external-links-config";
import { TIER_TOKENS } from "@/app/lib/tier-tokens";

export default async function DashboardProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Load profile + its current category links + the full category list +
  // the creator's external links (in display order). Single Promise.all so
  // all four queries hit the DB in parallel.
  const [creator, allCategories, externalLinks] = await Promise.all([
    prisma.creatorprofile.findUnique({
      where: { userId: Number(session.user.id) },
      include: {
        categories: { select: { categoryId: true } },
      },
    }),
    prisma.category.findMany({
      select: { id: true, slug: true, label: true },
      orderBy: { displayOrder: "asc" },
    }),
    // Fetch links in the same query batch — keyed on the user id, then
    // filtered server-side via the creatorprofile relation.
    prisma.creatorExternalLink.findMany({
      where: { creatorprofile: { userId: Number(session.user.id) } },
      orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
      select: { id: true, kind: true, url: true, displayOrder: true },
    }),
  ]);

  if (!creator) redirect("/");

  const selectedCategoryIds = new Set(
    creator.categories.map((c) => c.categoryId),
  );
  const selectedSlugs = allCategories
    .filter((c) => selectedCategoryIds.has(c.id))
    .map((c) => c.slug);

  const tokens = TIER_TOKENS[creator.tier];
  const TierIcon = tokens.icon;

  return (
    <div className="max-w-2xl space-y-6">
      {/* Tier-themed header. Top accent strip + tier badge keep the gold/
          purple/rose visual continuity from /dashboard so a paying creator
          feels "their world" stays consistent across surfaces. */}
      <div
        className="rounded-xl overflow-hidden border"
        style={{
          borderColor: tokens.borderStrong,
          background: tokens.surface,
        }}
      >
        <div
          style={{
            height: "2px",
            background: `linear-gradient(90deg, transparent, ${tokens.accent}, transparent)`,
          }}
        />
        <div className="px-5 py-4 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-white tracking-tight">
              Edit Profile
            </h1>
            <p className="text-[12px] text-white/35 mt-1">
              This information appears on your public creator profile.
            </p>
          </div>
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold tracking-[0.10em]"
            style={{
              background: tokens.badge.bg,
              border: `1px solid ${tokens.badge.border}`,
              color: tokens.badge.color,
            }}
          >
            <TierIcon size={11} strokeWidth={2.4} />
            {tokens.label.toUpperCase()}
          </span>
        </div>
      </div>

      <ProfileForm
        creatorId={creator.id}
        categories={allCategories.map((c) => ({ slug: c.slug, label: c.label }))}
        defaultValues={{
          displayName: creator.displayName,
          bio: creator.bio ?? "",
          location: creator.location ?? "",
          neighborhood: creator.neighborhood ?? "",
          whatsappNumber: creator.whatsappNumber ?? "",
          avatarUrl: creator.avatarUrl ?? null,
          categorySlugs: selectedSlugs,
          // Pass the birth date as an ISO YYYY-MM-DD string so the read-only
          // row can render it consistently and so the value never reaches
          // the form as an editable field.
          birthDate: creator.birthDate
            ? creator.birthDate.toISOString().slice(0, 10)
            : null,
          // Coerce the Json column to string[] for the form. Older rows
          // may have null or stray non-string entries — filter those out.
          customTags: Array.isArray(creator.customTags)
            ? creator.customTags.filter(
                (t): t is string => typeof t === "string",
              )
            : [],
        }}
      />

      {/* Divider between the main profile form and the external-links
          editor. Both touch the same creator but the editor has its own
          server actions (CRUD on CreatorExternalLink rows), so it lives
          in its own section. */}
      <div className="h-px bg-white/8" aria-hidden />

      <ExternalLinksEditor
        initialLinks={externalLinks}
        maxLinks={MAX_LINKS_PER_CREATOR}
      />
    </div>
  );
}
