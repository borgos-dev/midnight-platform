/**
 * scripts/seed-creators.ts
 *
 * Dev-only seed: populates the local DB with a realistic mix of creators
 * across all three tiers and several Cameroon cities so the homepage
 * actually looks like a product (shelves populated, grid filled,
 * neighborhood + city + view-count on every card).
 *
 * Run with:    npx tsx scripts/seed-creators.ts
 * Idempotent:  re-running refreshes the seeded creators' data without
 *              creating duplicates (keyed on the `seed_*@midnight.test`
 *              email convention).
 *
 * Do not run this against production. Test emails follow the
 * `seed_*@midnight.test` pattern so a real cleanup is one DELETE away.
 */

import { PrismaClient, AccessLevel, CreatorStatus } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

type Seed = {
  name: string;
  city: string;
  neighborhood: string;
  tier: AccessLevel;
  bio: string;
  views: number;
  whatsapp: string; // E.164-ish, just digits
};

// Per-creator age (whole years) for seed data. Spans 21–32 so the demo grid
// has plausible variety. Converted to a birthDate below — we store the date,
// not the integer, so age never goes stale.
const CREATOR_AGE: Record<string, number> = {
  Sophia: 24,
  Adèle: 27,
  Clara: 23,
  Mireille: 26,
  Esther: 29,
  Joelle: 22,
  Sandra: 25,
  Carine: 24,
  Léa: 21,
  Vanessa: 23,
  Naomi: 28,
  Inès: 26,
  Maya: 30,
};

// Build a birthDate that resolves to `age` whole years ago, centered on
// 2 January UTC (well clear of timezone wobble around the year boundary).
function birthDateForAge(age: number): Date {
  const today = new Date();
  return new Date(Date.UTC(today.getUTCFullYear() - age, 0, 2));
}

// Verification rule for seed data: VIP+ and VIP are always verified (they're
// the top trust tiers and VIP+ requires verification anyway). Premium gets a
// mix so the grid demos the contrast. Regular stays unverified.
function isVerified(tier: AccessLevel, name: string): boolean {
  if (tier === "VIP_PLUS" || tier === "VIP") return true;
  if (tier === "PREMIUM") return name === "Joelle" || name === "Sandra";
  return false;
}

// ── Categories ───────────────────────────────────────────────
// Ordered list — `displayOrder` matches array index so the pill row on the
// homepage renders in this exact order.
const CATEGORIES = [
  { slug: "THREESOME",   label: "Threesome"   },
  { slug: "ANAL",        label: "Anal"        },
  { slug: "TRANSGENDER", label: "Transgender" },
  { slug: "COUPLE",      label: "Couple"      },
  { slug: "BDSM",        label: "BDSM"        },
  { slug: "ROLEPLAY",    label: "Roleplay"    },
  { slug: "MASSAGE",     label: "Massage"     },
  { slug: "ESCORT",      label: "Escort"      },
  { slug: "WEBCAM",      label: "Webcam"      },
  { slug: "COMPANION",   label: "Companion"   },
] as const;

// Per-creator category assignments. Each creator gets 1–4 categories so the
// grid demos overlap (a creator can appear under multiple filters).
const CREATOR_CATEGORIES: Record<string, string[]> = {
  Sophia:   ["ESCORT", "COMPANION", "ROLEPLAY"],
  Adèle:    ["ESCORT", "MASSAGE", "COMPANION"],
  Clara:    ["COUPLE", "THREESOME", "ROLEPLAY"],
  Mireille: ["ESCORT", "MASSAGE"],
  Esther:   ["ESCORT", "COMPANION"],
  Joelle:   ["ESCORT", "BDSM"],
  Sandra:   ["MASSAGE", "COMPANION"],
  Carine:   ["WEBCAM", "ROLEPLAY"],
  Léa:      ["MASSAGE"],
  Vanessa:  ["WEBCAM"],
  Naomi:    ["ESCORT", "ANAL"],
  Inès:     ["COUPLE"],
  Maya:     ["MASSAGE", "COMPANION"],
};

const CREATORS: Seed[] = [
  // ── VIP+ Elite (gold, top shelf) ─────────────────────────────────
  {
    name: "Sophia",
    city: "Douala",
    neighborhood: "Bonapriso",
    tier: "VIP_PLUS",
    bio: "Available for bookings in the city — discreet & professional. Contact via WhatsApp.",
    views: 2840,
    whatsapp: "237670000001",
  },
  {
    name: "Adèle",
    city: "Yaoundé",
    neighborhood: "Bastos",
    tier: "VIP_PLUS",
    bio: "Verified profile. Evenings & weekends. Reach out anytime.",
    views: 1980,
    whatsapp: "237670000002",
  },

  // ── VIP Featured (purple, mid shelf) ─────────────────────────────
  {
    name: "Clara",
    city: "Douala",
    neighborhood: "Makepe",
    tier: "VIP",
    bio: "Hi, I'm here for genuine connections.",
    views: 1120,
    whatsapp: "237670000003",
  },

  // ── Premium (rose, visibility-only boost) ────────────────────────
  {
    name: "Joelle",
    city: "Douala",
    neighborhood: "Bonanjo",
    tier: "PREMIUM",
    bio: "Independent · Verified · WhatsApp only.",
    views: 540,
    whatsapp: "237670000011",
  },
  {
    name: "Sandra",
    city: "Yaoundé",
    neighborhood: "Bastos",
    tier: "PREMIUM",
    bio: "Available evenings. Discreet bookings.",
    views: 470,
    whatsapp: "237670000012",
  },
  {
    name: "Carine",
    city: "Buea",
    neighborhood: "Molyko",
    tier: "PREMIUM",
    bio: "Hi, I'm Carine — premium experience guaranteed.",
    views: 380,
    whatsapp: "237670000013",
  },
  {
    name: "Mireille",
    city: "Douala",
    neighborhood: "Akwa",
    tier: "VIP",
    bio: "Top-rated companion in the city.",
    views: 980,
    whatsapp: "237670000004",
  },
  {
    name: "Esther",
    city: "Yaoundé",
    neighborhood: "Mvog-Ada",
    tier: "VIP",
    bio: "Available evenings. Contact for rates.",
    views: 740,
    whatsapp: "237670000005",
  },

  // ── Regular (main grid) ──────────────────────────────────────────
  {
    name: "Léa",
    city: "Douala",
    neighborhood: "Bonamoussadi",
    tier: "REGULAR",
    bio: "Friendly, discreet, professional.",
    views: 320,
    whatsapp: "237670000006",
  },
  {
    name: "Vanessa",
    city: "Douala",
    neighborhood: "Bonanjo",
    tier: "REGULAR",
    bio: "New on Midnight. Available for bookings.",
    views: 240,
    whatsapp: "237670000007",
  },
  {
    name: "Naomi",
    city: "Yaoundé",
    neighborhood: "Nlongkak",
    tier: "REGULAR",
    bio: "Available weekends. WhatsApp me.",
    views: 180,
    whatsapp: "237670000008",
  },
  {
    name: "Inès",
    city: "Bafoussam",
    neighborhood: "Famla",
    tier: "REGULAR",
    bio: "Hi, I'm Inès. Available for bookings.",
    views: 95,
    whatsapp: "237670000009",
  },
  {
    name: "Maya",
    city: "Kribi",
    neighborhood: "Mpalla",
    tier: "REGULAR",
    bio: "Coastal vibes. Contact for arrangements.",
    views: 140,
    whatsapp: "237670000010",
  },
];

function slug(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function main() {
  console.log(`Seeding ${CATEGORIES.length} categories…`);

  // Upsert categories first so we can attach creators by slug below.
  const categoryBySlug = new Map<string, number>();
  for (let i = 0; i < CATEGORIES.length; i++) {
    const cat = CATEGORIES[i];
    const row = await prisma.category.upsert({
      where: { slug: cat.slug },
      create: { slug: cat.slug, label: cat.label, displayOrder: i },
      update: { label: cat.label, displayOrder: i },
    });
    categoryBySlug.set(cat.slug, row.id);
  }

  console.log(`Seeding ${CREATORS.length} creators…`);

  // One shared password for every seed account — fast to hash once.
  // These accounts are dev-only and never used to log in interactively.
  const passwordHash = await bcrypt.hash("SeedPass2026!", 10);

  for (const c of CREATORS) {
    const s = slug(c.name);
    const email = `seed_${s}@midnight.test`;
    // Stylized avatar via dicebear so seed data carries no real faces.
    const avatarUrl = `https://api.dicebear.com/9.x/lorelei/svg?seed=${encodeURIComponent(c.name)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
    // Placeholder gallery media — stable per-seed via picsum.
    const mediaUrl = `https://picsum.photos/seed/${s}/600/600`;

    // 1. user (auth account)
    const user = await prisma.user.upsert({
      where: { email },
      create: {
        email,
        passwordHash,
        name: c.name,
        role: "CREATOR",
        emailVerified: true,
      },
      update: {
        name: c.name,
        emailVerified: true,
      },
    });

    // 2. creatorprofile (public profile)
    //
    // The profileViews{Today,Week,Month} columns were dropped — views are
    // now computed from AnalyticsEvent. Step 5 below seeds those events so
    // the homepage rankings show non-zero numbers without faking a column.
    const profile = await prisma.creatorprofile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        displayName: c.name,
        bio: c.bio,
        location: c.city,
        neighborhood: c.neighborhood,
        tier: c.tier,
        status: "APPROVED" as CreatorStatus,
        verified: isVerified(c.tier, c.name),
        birthDate: CREATOR_AGE[c.name]
          ? birthDateForAge(CREATOR_AGE[c.name])
          : null,
        avatarUrl,
        whatsappNumber: c.whatsapp,
      },
      update: {
        displayName: c.name,
        bio: c.bio,
        location: c.city,
        neighborhood: c.neighborhood,
        tier: c.tier,
        status: "APPROVED" as CreatorStatus,
        verified: isVerified(c.tier, c.name),
        birthDate: CREATOR_AGE[c.name]
          ? birthDateForAge(CREATOR_AGE[c.name])
          : null,
        avatarUrl,
        whatsappNumber: c.whatsapp,
      },
    });

    // 3. category assignments — wipe and re-create so re-running the seed
    //    stays idempotent if CREATOR_CATEGORIES is edited.
    await prisma.creatorCategory.deleteMany({
      where: { creatorprofileId: profile.id },
    });
    const slugs = CREATOR_CATEGORIES[c.name] ?? [];
    if (slugs.length > 0) {
      await prisma.creatorCategory.createMany({
        data: slugs
          .map((slug) => categoryBySlug.get(slug))
          .filter((id): id is number => typeof id === "number")
          .map((categoryId) => ({ creatorprofileId: profile.id, categoryId })),
      });
    }

    // 4. one gallery post per creator (if none yet) — gives PhotoTile a
    //    real cover image instead of an initial-letter placeholder.
    const existing = await prisma.post.findFirst({
      where: { creatorId: profile.id, postType: "GALLERY" },
      select: { id: true },
    });

    if (!existing) {
      await prisma.post.create({
        data: {
          creatorId: profile.id,
          title: `${c.name}'s gallery`,
          postType: "GALLERY",
          accessLevel: "REGULAR",
          blurred: false,
          media: {
            create: {
              creatorId: profile.id,
              kind: "IMAGE",
              filePath: mediaUrl,
              mimeType: "image/jpeg",
              sizeBytes: 80_000,
            },
          },
        },
      });
    }

    // 5. Seed AnalyticsEvent rows so the homepage rankings + dashboard
    //    tiles show realistic numbers. The previous version of this script
    //    wrote fake monthly-views columns directly — those columns are
    //    gone now, so we spread `c.views` events across the last 30 days
    //    to exercise the real read path (windowed groupBy on
    //    AnalyticsEvent). Idempotent: we clear seeded events first so
    //    re-running the script doesn't double up.
    await prisma.analyticsEvent.deleteMany({
      where: {
        creatorId: profile.id,
        source: { startsWith: "seed:" },
      },
    });

    const eventRows: { creatorId: number; eventType: string; source: string; createdAt: Date }[] = [];
    const now = Date.now();
    const thirtyDaysMs = 30 * 86_400_000;
    for (let i = 0; i < c.views; i++) {
      // Random offset within the last 30 days, weighted toward "recent"
      // (cube the random so most events land in the last week — matches
      // the natural "fresh creators get more traffic" curve and keeps
      // the rolling-7-day Top 3 numbers non-trivial).
      const r = Math.random();
      const offsetMs = Math.pow(r, 3) * thirtyDaysMs;
      eventRows.push({
        creatorId: profile.id,
        eventType: "profile_view",
        // Unique-ish source so the API's per-(visitor, creator, eventType)
        // dedup wouldn't have skipped the row — these are seed rows, not
        // real visitors, so collisions don't matter.
        source: `seed:${profile.id}:${i}`,
        createdAt: new Date(now - offsetMs),
      });
    }
    // Spread a small click count too — roughly 1 click per 20 views — so
    // dashboard conversion-rate numbers show something realistic.
    const clicksToSeed = Math.max(1, Math.floor(c.views / 20));
    for (let i = 0; i < clicksToSeed; i++) {
      const r = Math.random();
      const offsetMs = Math.pow(r, 3) * thirtyDaysMs;
      eventRows.push({
        creatorId: profile.id,
        eventType: "whatsapp_click",
        source: `seed:${profile.id}:click:${i}`,
        createdAt: new Date(now - offsetMs),
      });
    }
    if (eventRows.length > 0) {
      await prisma.analyticsEvent.createMany({ data: eventRows });
    }

    console.log(`  ✓ ${c.tier.padEnd(8)} ${c.name.padEnd(12)} ${c.neighborhood}, ${c.city} (${c.views} events)`);
  }

  // ── Ads ──
  // Idempotent: clear seeded ads (by title prefix) and recreate. Real
  // production ads added via Prisma Studio or future admin UI won't match
  // the prefix and stay untouched.
  await prisma.ad.deleteMany({ where: { title: { startsWith: "[SEED]" } } });

  // 1) House ad — Midnight's own promo for new creators.
  await prisma.ad.create({
    data: {
      kind: "HOUSE",
      title: "[SEED] Become a Creator on Midnight",
      body: "Set your own rates. Verified by us. Pay-per-tier visibility — start free, upgrade when you're ready.",
      ctaLabel: "JOIN NOW",
      ctaUrl: "/become-a-member",
      priority: 10,
    },
  });

  // 2) Promoted creator — pick a Regular tier creator with the highest
  //    rolling-30-day view count from AnalyticsEvent. Falls back to any
  //    approved creator. Picking by view count keeps the promoted ad
  //    pointing at someone actually worth highlighting.
  const since = new Date(Date.now() - 30 * 86_400_000);
  const candidates = await prisma.creatorprofile.findMany({
    where: { status: "APPROVED" },
    select: { id: true, tier: true, displayName: true },
  });
  const viewCounts = candidates.length > 0
    ? await prisma.analyticsEvent.groupBy({
        by: ["creatorId"],
        where: {
          creatorId: { in: candidates.map((c) => c.id) },
          eventType: "profile_view",
          createdAt: { gte: since },
        },
        _count: { _all: true },
      })
    : [];
  const viewMap = new Map(viewCounts.map((v) => [v.creatorId, v._count._all]));
  const sortedRegular = candidates
    .filter((c) => c.tier === "REGULAR")
    .sort((a, b) => (viewMap.get(b.id) ?? 0) - (viewMap.get(a.id) ?? 0));
  const sortedAny = [...candidates].sort(
    (a, b) => (viewMap.get(b.id) ?? 0) - (viewMap.get(a.id) ?? 0),
  );
  const promoTarget = sortedRegular[0] ?? sortedAny[0] ?? null;

  if (promoTarget) {
    await prisma.ad.create({
      data: {
        kind: "PROMOTED_CREATOR",
        title: "[SEED] Featured this week",
        body: "Boosted Regular-tier creator. Tap to see her gallery and WhatsApp.",
        ctaLabel: "VIEW PROFILE",
        ctaUrl: `/creator/${promoTarget.id}`,
        creatorprofileId: promoTarget.id,
        priority: 5,
      },
    });
    console.log(`  ✓ AD       Promoted ${promoTarget.displayName}`);
  }
  console.log(`  ✓ AD       House: Become a Creator`);

  console.log("\nDone. Refresh http://localhost:3000 to see the seeded grid.");
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
