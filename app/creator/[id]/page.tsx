import Image from "next/image";
import Link from "next/link";
import { Crown, BadgeCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { WhatsAppButton } from "@/app/components/creator/WhatsAppButton";
import { ShareButton } from "@/app/components/creator/ShareButton";
import { ReportButton } from "@/app/components/creator/ReportButton";
// UpgradeLink import dropped — every visitor now sees the WhatsApp button
// regardless of tier (see ctaNode below). The component file is kept in
// case a future visitor-side product wants the upgrade affordance.
import { notFound } from "next/navigation";
import { AccessLevel } from "@prisma/client";
import { refreshExpiredSubscriptions } from "@/app/lib/subscription";
import { computeAge } from "@/app/lib/creator-shape";
import { CreatorProfileContent } from "@/app/components/creator/CreatorProfileContent";
import { ExternalLinksList } from "@/app/components/creator/ExternalLinksList";
import { RatingStars } from "@/app/components/creator/RatingStars";
import { ReviewList } from "@/app/components/creator/ReviewList";
import { ReviewForm } from "@/app/components/creator/ReviewForm";
import {
  getCreatorRatingSummary,
  listPublicReviewsForCreator,
} from "@/app/lib/reviews-server";
import { getMyReviewForCreator } from "@/app/actions/reviews";
import { getCurrentCreatorProfile } from "@/app/lib/auth-helpers";
import { buttonClasses } from "@/app/components/ui/Button";
import { getPrimaryButtonVariant } from "@/app/lib/ab";
import { lockedPreviewUrl } from "@/app/lib/media-url";
import type { Metadata } from "next";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

// Tier rank governs content visibility: a viewer can see a post only when
// their tier rank >= the post's access level rank.
const tierRank: Record<AccessLevel, number> = {
  REGULAR: 0,
  PREMIUM: 1,
  VIP: 2,
  VIP_PLUS: 3,
} as const;

// ─────────────────────────────────────────────────────────────
// Metadata for share previews / SEO
// ─────────────────────────────────────────────────────────────
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const creatorId = Number(id);
  if (isNaN(creatorId) || creatorId <= 0) {
    return { title: "Creator not found — Midnight" };
  }

  const creator = await prisma.creatorprofile.findUnique({
    where: { id: creatorId },
    select: { displayName: true, bio: true, avatarUrl: true, location: true },
  });
  if (!creator) return { title: "Creator not found — Midnight" };

  const desc =
    creator.bio ??
    `${creator.displayName} on Midnight${creator.location ? `, based in ${creator.location}` : ""}`;

  return {
    title: `${creator.displayName} — Midnight`,
    description: desc,
    openGraph: {
      title: `${creator.displayName} — Midnight`,
      description: desc,
      images: creator.avatarUrl ? [creator.avatarUrl] : undefined,
    },
  };
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

/** Derive a coarse "last active" bucket from updatedAt + recent post timestamps. */
function getActivitySignal(
  updatedAt: Date,
  mostRecentPostAt: Date | null,
): string | null {
  const latest =
    mostRecentPostAt && mostRecentPostAt > updatedAt ? mostRecentPostAt : updatedAt;
  const diffMs = Date.now() - latest.getTime();
  const day = 86_400_000;
  if (diffMs < day) return "Active today";
  if (diffMs < 7 * day) return "Active this week";
  if (diffMs < 30 * day) return "Active recently";
  return null;
}

/** Pull the services JSON column into a string[] safely. */
function parseServices(json: unknown): string[] {
  if (!Array.isArray(json)) return [];
  return json.filter((s): s is string => typeof s === "string" && s.trim() !== "");
}

function formatCfa(amount: number): string {
  return `${amount.toLocaleString("en-US")} CFA`;
}

function Avatar({
  url,
  name,
  size,
  ringClass,
  priority = false,
}: {
  url: string | null;
  name: string;
  size: number;
  ringClass: string;
  priority?: boolean;
}) {
  if (url) {
    return (
      <div
        className={`relative rounded-full overflow-hidden ${ringClass}`}
        style={{ width: size, height: size }}
      >
        <Image
          src={url}
          alt={name}
          fill
          sizes={`${size}px`}
          priority={priority}
          unoptimized={!url.startsWith("https://res.cloudinary.com")}
          className="object-cover"
        />
      </div>
    );
  }
  return (
    <div
      className={`flex items-center justify-center rounded-full bg-white/10 text-white font-semibold ${ringClass}`}
      style={{
        width: size,
        height: size,
        fontFamily: "var(--font-cormorant)",
        fontSize: Math.round(size * 0.42),
      }}
      aria-label={name}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────

export default async function CreatorProfilePage({ params }: Props) {
  const { id } = await params;
  await refreshExpiredSubscriptions();

  const viewerCreator = await getCurrentCreatorProfile();
  const viewerTier: AccessLevel = viewerCreator?.tier ?? "REGULAR";
  const viewerId = viewerCreator?.id ?? null;

  const creatorId = Number(id);
  if (isNaN(creatorId) || creatorId <= 0) return notFound();

  const creator = await prisma.creatorprofile.findUnique({
    where: { id: creatorId },
    include: {
      post: {
        include: { likes: true, media: true },
        orderBy: { createdAt: "desc" },
      },
      // Platform-curated categories (multi-select from the dashboard
      // picker). We pull the join rows + their Category labels so the
      // public profile can render category chips with display names.
      categories: {
        include: {
          category: { select: { slug: true, label: true } },
        },
      },
      // External links — rendered as branded chips between the bio and
      // the WhatsApp CTA. Only `id` + `kind` ship to the client so the
      // raw URL never appears in the DOM; visitors reach the URL via
      // /api/link-click/[id] which records the click and 302-redirects.
      externalLinks: {
        orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
        select: { id: true, kind: true },
      },
    },
  });

  if (!creator) return notFound();

  // Shape category labels for display. Custom tags come straight off the
  // creatorprofile row as a JSON array.
  const categoryLabels: { slug: string; label: string }[] = creator.categories
    .map((c) => c.category)
    .filter((c): c is { slug: string; label: string } => c !== null);
  const customTagLabels: string[] = Array.isArray(creator.customTags)
    ? creator.customTags.filter((t): t is string => typeof t === "string")
    : [];

  const creatorTier = creator.tier as AccessLevel;
  const services = parseServices(creator.services);
  const priceCfa = creator.priceCfaFrom;
  const age = computeAge(creator.birthDate ?? null);

  const mostRecentPostAt = creator.post[0]?.createdAt ?? null;
  const activity = getActivitySignal(creator.updatedAt, mostRecentPostAt);

  // Reviews — three parallel reads:
  //   1. Aggregate rating + count (shown next to the creator's name when
  //      at least one review exists).
  //   2. Public review list (newest 20, with comment text only when
  //      admin-approved).
  //   3. The calling visitor's own existing review, if any — pre-fills
  //      the inline form so they can edit instead of starting fresh.
  const [ratingSummary, reviews, myReview] = await Promise.all([
    getCreatorRatingSummary(creator.id),
    listPublicReviewsForCreator(creator.id, 20),
    getMyReviewForCreator(creator.id),
  ]);

  const isOwner = viewerId === creator.id;
  // (Note for code readers): the previous `canSeeWhatsApp` gate was
  // removed in this pass. WhatsApp is open to every visitor regardless
  // of tier — see ctaNode below for the rationale. Kept this comment
  // here so future audits don't reintroduce a gate by accident.

  const primaryVariant = getPrimaryButtonVariant({ userId: viewerId });

  const whatsappLinkRaw = creator.whatsappNumber
    ? `https://wa.me/${encodeURIComponent(
        creator.whatsappNumber.replace(/[^0-9]/g, ""),
      )}?text=${encodeURIComponent(
        `Hi ${creator.displayName}, I saw your profile on Midnight and I'd like to book you.`,
      )}`
    : null;

  const isVipPlus = creatorTier === "VIP_PLUS";
  const isVip = creatorTier === "VIP";

  const avatarRing = isVipPlus
    ? "ring-[3px] ring-brand-gold/70"
    : isVip
      ? "ring-[3px] ring-brand-purple/60"
      : "ring-1 ring-white/10";

  const badgeEl = isVipPlus ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-brand-gold/15 border border-brand-gold/40 px-2 py-0.5 text-eyebrow font-semibold text-brand-gold">
      <Crown size={11} aria-hidden /> Elite Creator
    </span>
  ) : isVip ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-brand-purple/15 border border-brand-purple/40 px-2 py-0.5 text-eyebrow font-semibold text-brand-purple">
      VIP
    </span>
  ) : null;

  // No gate — every visitor sees the WhatsApp button when the creator
  // has set a WhatsApp number. The previous UpgradeLink fallback (shown
  // when the viewer's tier was below VIP+) is gone; that gate killed
  // visitor → creator conversion at exactly the moment the visitor was
  // interested. The UpgradeLink component still exists in case it's
  // useful for a different surface (e.g. a future visitor-side
  // subscription product), but it's no longer wired here.
  const ctaNode = creator.whatsappNumber && whatsappLinkRaw ? (
    <WhatsAppButton
      whatsappLink={whatsappLinkRaw}
      creatorId={creator.id}
      isVipPlus={isVipPlus}
      primaryVariant={primaryVariant}
    />
  ) : null;

  const editLink = isOwner ? (
    <Link
      href="/dashboard/profile"
      className={buttonClasses("ghost", "sm")}
    >
      Edit profile
    </Link>
  ) : null;

  const shareUrl =
    process.env.NEXT_PUBLIC_SITE_URL
      ? `${process.env.NEXT_PUBLIC_SITE_URL}/creator/${creator.id}`
      : `/creator/${creator.id}`;

  const servicesBlock =
    services.length > 0 || priceCfa ? (
      <div>
        <p className="text-eyebrow uppercase tracking-[0.08em] text-white/40 mb-2">
          What I offer
        </p>
        {services.length > 0 && (
          <ul className="space-y-1.5 mb-2">
            {services.map((s) => (
              <li
                key={s}
                className="flex items-start gap-2 text-sm text-white/80"
              >
                <span className="text-purple-400 mt-0.5">·</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        )}
        {priceCfa ? (
          <p className="text-sm text-white/90">
            <span className="text-white/50">Starting from </span>
            <span className="font-semibold">{formatCfa(priceCfa)}</span>
          </p>
        ) : (
          <p className="text-xs text-white/45">Contact for pricing details</p>
        )}
      </div>
    ) : isOwner ? (
      <div className="rounded-xl border border-dashed border-white/15 p-3 text-xs text-white/55">
        Add your services and starting price in{" "}
        <Link href="/dashboard/profile" className="text-purple-300 underline">
          your profile editor
        </Link>{" "}
        — bookings convert better when visitors know what they're contacting you about.
      </div>
    ) : null;

  const profileContent = (
    <CreatorProfileContent
      posts={creator.post.map((post) => {
        // `locked` = viewer doesn't meet the post's access-level tier.
        // Independent from the creator's per-post blur flag — a Public
        // post is never "locked" even if the creator marked it as
        // blurred for tease purposes.
        const tierLocked =
          tierRank[viewerTier] < tierRank[post.accessLevel];
        // The OWNER always sees their own content un-blurred regardless
        // of either flag (no tease needed when they posted it). For
        // everyone else: render the blur if EITHER the creator opted
        // in OR the viewer lacks tier access. That way "Public + blur"
        // teases everyone except the owner, and "VIP+ only" still gates
        // by tier whether or not the creator ticked blur.
        const locked = !isOwner && (tierLocked || post.blurred);
        return {
          id: post.id,
          title: post.title,
          content: post.content,
          postType: post.postType,
          accessLevel: post.accessLevel,
          blurred: post.blurred,
          // Forward the per-post blur intensity + lock toggle so the
          // creator's choices reach the FeedPost renderer. Without these
          // every gated post would render at the default 8px blur with
          // the WhatsApp lock CTA, ignoring the upload form's settings.
          blurIntensity: post.blurIntensity,
          showLock: post.showLock,
          locked,
          likes: post.likes.length,
          media: post.media.map((m) => ({
            id: m.id,
            // Owner / entitled viewers get the real asset. Locked viewers
            // get a SERVER-blurred Cloudinary derivative when the creator
            // opted into the blur tease, and nothing at all otherwise — the
            // original URL never reaches a non-entitled client.
            filePath: !locked
              ? m.filePath
              : post.blurred
                ? lockedPreviewUrl(m.filePath, m.kind)
                : "",
            kind: m.kind,
          })),
        };
      })}
      creator={{
        id: String(creator.id),
        name: creator.displayName,
        city: creator.location ?? "",
        image: creator.avatarUrl ?? "",
        whatsapp: "",
        verified: creator.verified,
        tier: creatorTier,
      }}
      viewerTier={viewerTier}
    />
  );

  return (
    // pt-24 (96px) / xl:pt-28 (112px) — the global Navbar is now 80px
    // tall, so we add 16-32px breathing room on top of that for the
    // page content. Previous values (pt-20 / xl:pt-24) left the
    // gallery tabs sitting right under the navbar with no air gap.
    <div className="mx-auto max-w-xl xl:max-w-6xl xl:px-8 pt-24 xl:pt-28 pb-32 xl:pb-12 text-white">
      <div className="xl:grid xl:grid-cols-[1fr_320px] xl:gap-10">
        {/* ─── MAIN COLUMN ─── */}
        <main className="min-w-0">
          {/* Mobile header (hidden on desktop — the sidebar shows this info) */}
          <div className="xl:hidden">
            <div className="flex items-start gap-4 p-5">
              <Avatar
                url={creator.avatarUrl ?? null}
                name={creator.displayName}
                size={80}
                ringClass={avatarRing}
                priority
              />

              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-bold tracking-tight inline-flex items-center gap-1.5">
                    {creator.displayName}
                    {age != null && (
                      <span className="text-white/60 font-semibold">, {age}</span>
                    )}
                    {creator.verified && (
                      <BadgeCheck
                        size={18}
                        className="text-sky-400"
                        aria-label="Verified"
                      />
                    )}
                  </h1>
                  {badgeEl}
                </div>
                <div className="flex items-center gap-2 flex-wrap text-sm">
                  {creator.location && (
                    <span className="text-white/45">
                      {creator.neighborhood
                        ? `${creator.neighborhood}, ${creator.location}`
                        : creator.location}
                    </span>
                  )}
                  {activity && (
                    <>
                      {creator.location && <span className="text-white/20">·</span>}
                      <span className="inline-flex items-center gap-1 text-emerald-300/90 text-xs">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        {activity}
                      </span>
                    </>
                  )}
                </div>
                {/* Mobile rating chip — appears only once a review exists,
                    so a brand-new creator doesn't read as 0-star. */}
                {ratingSummary && (
                  <div className="mt-1.5">
                    <RatingStars
                      rating={ratingSummary.averageRating}
                      size={13}
                      showValue
                      count={ratingSummary.reviewCount}
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <ShareButton
                  url={shareUrl}
                  title={`${creator.displayName} — Midnight`}
                  text={creator.bio ?? undefined}
                />
                {!isOwner && (
                  <ReportButton
                    creatorId={creator.id}
                    creatorName={creator.displayName}
                  />
                )}
              </div>
            </div>

            {creator.bio && (
              <p className="px-5 pb-4 text-white/60 text-sm leading-relaxed max-w-prose">
                {creator.bio}
              </p>
            )}

            {/* External links — sit between bio and contact CTAs so they
                read as "where else to find me" context before visitors
                hit WhatsApp (the primary conversion at the bottom). */}
            {creator.externalLinks.length > 0 && (
              <div className="px-5 pb-4">
                <ExternalLinksList links={creator.externalLinks} />
              </div>
            )}

            {/* Categories + custom tags. Platform categories share their
                styling with the homepage filter pills so visitors learn
                one visual vocabulary; creator-typed custom tags use a
                neutral chip style so the distinction is legible. */}
            {(categoryLabels.length > 0 || customTagLabels.length > 0) && (
              <div className="px-5 pb-4">
                <ChipRow
                  categories={categoryLabels}
                  customTags={customTagLabels}
                />
              </div>
            )}

            {servicesBlock && <div className="px-5 pb-4">{servicesBlock}</div>}

            {editLink && <div className="px-5 pb-4">{editLink}</div>}
          </div>

          {profileContent}

          {/* Reviews section — sits below the gallery/feed tabs at the
              bottom of the main column. Pattern matches the launch-prep
              decision: visitors scroll past the actual content before
              the review surface appears, which self-selects more
              considered (less drive-by) ratings. Hidden on the creator's
              own profile so they can't post a review on themselves
              and inflate their numbers; isOwner already covers the
              submission server-side too. */}
          <section className="px-5 pt-2 pb-6 xl:px-0" aria-label="Visitor reviews">
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h2 className="text-base font-semibold tracking-tight text-white">
                Reviews
              </h2>
              {ratingSummary && (
                <span className="text-[11px] font-mono text-white/55 tracking-wider">
                  {ratingSummary.reviewCount} total
                </span>
              )}
            </div>
            <ReviewList reviews={reviews} />
            {!isOwner && (
              <ReviewForm
                creatorprofileId={creator.id}
                creatorName={creator.displayName}
                initial={
                  myReview
                    ? { rating: myReview.rating, comment: myReview.comment }
                    : null
                }
              />
            )}
          </section>
        </main>

        {/* ─── DESKTOP SIDEBAR (sticky) ─── */}
        <aside className="hidden xl:block">
          <div className="sticky top-24 rounded-2xl border border-white/10 bg-white/3 p-6 space-y-5">
            <div className="flex flex-col items-center text-center">
              <Avatar
                url={creator.avatarUrl ?? null}
                name={creator.displayName}
                size={112}
                ringClass={avatarRing}
                priority
              />
              <h1 className="mt-4 text-xl font-bold tracking-tight inline-flex items-center gap-1.5">
                {creator.displayName}
                {age != null && (
                  <span className="text-white/60 font-semibold">, {age}</span>
                )}
                {creator.verified && (
                  <BadgeCheck
                    size={18}
                    className="text-sky-400"
                    aria-label="Verified"
                  />
                )}
              </h1>
              {badgeEl && <div className="mt-2">{badgeEl}</div>}
              {creator.location && (
                <p className="mt-2 text-white/45 text-sm">
                  {creator.neighborhood
                    ? `${creator.neighborhood}, ${creator.location}`
                    : creator.location}
                </p>
              )}
              {activity && (
                <span className="mt-2 inline-flex items-center gap-1.5 text-emerald-300/90 text-xs">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  {activity}
                </span>
              )}
              {/* Desktop sidebar rating chip — same data, centered with
                  the avatar-and-name stack above. */}
              {ratingSummary && (
                <div className="mt-2 flex justify-center">
                  <RatingStars
                    rating={ratingSummary.averageRating}
                    size={13}
                    showValue
                    count={ratingSummary.reviewCount}
                  />
                </div>
              )}
              <div className="mt-3 flex items-center gap-2">
                <ShareButton
                  url={shareUrl}
                  title={`${creator.displayName} — Midnight`}
                  text={creator.bio ?? undefined}
                />
                {!isOwner && (
                  <ReportButton
                    creatorId={creator.id}
                    creatorName={creator.displayName}
                  />
                )}
                {editLink}
              </div>
            </div>

            {creator.bio && (
              <>
                <div className="h-px bg-white/10" />
                <p className="text-white/65 text-sm leading-relaxed">
                  {creator.bio}
                </p>
              </>
            )}

            {/* External links sit between bio and chips on desktop too —
                same reading order as mobile. Renders nothing when the
                creator has no links. */}
            {creator.externalLinks.length > 0 && (
              <>
                <div className="h-px bg-white/10" />
                <ExternalLinksList links={creator.externalLinks} />
              </>
            )}

            {(categoryLabels.length > 0 || customTagLabels.length > 0) && (
              <>
                <div className="h-px bg-white/10" />
                <ChipRow
                  categories={categoryLabels}
                  customTags={customTagLabels}
                />
              </>
            )}

            {servicesBlock && (
              <>
                <div className="h-px bg-white/10" />
                {servicesBlock}
              </>
            )}

            {ctaNode && (
              <>
                <div className="h-px bg-white/10" />
                <div>{ctaNode}</div>
              </>
            )}
          </div>
        </aside>
      </div>

      {/* ─── STICKY CTA BAR (mobile/tablet only) ─── */}
      {ctaNode && (
        <div
          className="xl:hidden fixed inset-x-0 bottom-0 z-40 px-4 pt-3 border-t border-white/10 bg-[#0a0a0a]"
          style={{
            paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)",
          }}
        >
          <div className="max-w-xl mx-auto">{ctaNode}</div>
        </div>
      )}
    </div>
  );
}

/**
 * Inline category + custom-tag chip strip used in both the mobile header
 * and the desktop sidebar. Platform categories carry the brand purple so
 * visitors recognize them as the same vocabulary as the homepage filter
 * pills; creator-typed custom tags use a neutral outline so the two
 * sets stay visually distinct.
 *
 * Renders nothing when both arrays are empty — the parent's null-check
 * is the gate, but we double-check here as a defensive no-op.
 */
function ChipRow({
  categories,
  customTags,
}: {
  categories: { slug: string; label: string }[];
  customTags: string[];
}) {
  if (categories.length === 0 && customTags.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {categories.map((c) => (
        <span
          key={`cat-${c.slug}`}
          className="inline-flex items-center rounded-full bg-purple-500/12 border border-purple-500/35 px-2.5 py-1 text-[11.5px] font-medium text-purple-100"
        >
          {c.label}
        </span>
      ))}
      {customTags.map((t, i) => (
        <span
          key={`tag-${i}-${t}`}
          className="inline-flex items-center rounded-full bg-white/4 border border-white/15 px-2.5 py-1 text-[11.5px] font-medium text-white/75"
        >
          {t}
        </span>
      ))}
    </div>
  );
}
