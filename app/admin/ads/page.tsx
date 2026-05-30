import Link from "next/link";
import { Pause, Play, Trash2, Plus, Megaphone, Crown } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { createHouseAd, pauseAd, resumeAd, deleteAd } from "./actions";

export const dynamic = "force-dynamic";

function fmt(d: Date | null | undefined): string {
  if (!d) return "—";
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Ad management surface.
 *
 * Three sections:
 *   - "Create new house ad" form at the top (so a fresh admin doesn't
 *     have to scroll). HOUSE ads are admin-curated brand promos.
 *   - Existing HOUSE ads, sorted by status (ACTIVE first) then priority.
 *     Each row has Pause/Resume + Delete.
 *   - PROMOTED_CREATOR ads (driven by approved boosts), read-only here —
 *     deleting one would orphan its Boost. We expose Pause/Resume for
 *     emergency take-downs but link back to /admin/boosts for the
 *     normal flow.
 */
export default async function AdminAdsPage() {
  const [houseAds, creatorAds, activeBoostCount] = await Promise.all([
    prisma.ad.findMany({
      where: { kind: "HOUSE" },
      orderBy: [{ status: "asc" }, { priority: "desc" }, { createdAt: "desc" }],
    }),
    prisma.ad.findMany({
      where: { kind: "PROMOTED_CREATOR" },
      include: {
        creatorprofile: { select: { id: true, displayName: true } },
        boost: { select: { id: true, status: true } },
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    }),
    prisma.boost.count({ where: { status: "ACTIVE" } }),
  ]);

  return (
    <div className="min-h-screen bg-black text-white p-6 lg:p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Ad campaigns</h1>
        <p className="text-white/50 text-sm mt-1">
          Manage the homepage sponsored slot. House ads are Midnight&apos;s
          own promos; promoted-creator ads come from approved boosts.
        </p>
      </header>

      {/* CREATE NEW HOUSE AD */}
      <section className="mb-10 rounded-xl border border-purple-500/30 bg-purple-500/5 p-5">
        <h2 className="text-sm font-bold uppercase tracking-widest text-purple-300 mb-4 flex items-center gap-2">
          <Plus size={14} strokeWidth={2.5} />
          Create house ad
        </h2>
        <form action={createHouseAd} className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FormField label="Title" name="title" required maxLength={120} placeholder="Become a Creator on Midnight" />
            <FormField
              label="CTA label"
              name="ctaLabel"
              required
              maxLength={40}
              placeholder="JOIN NOW"
            />
          </div>

          <FormField
            label="Body (optional)"
            name="body"
            maxLength={300}
            placeholder="Set your own rates. Verified by us. Start free."
            textarea
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FormField
              label="CTA path (same-origin only)"
              name="ctaUrl"
              required
              maxLength={500}
              placeholder="/become-a-member"
              hint="Must start with '/'. Defends against open-redirect."
            />
            <FormField
              label="Image URL (optional)"
              name="imageUrl"
              maxLength={500}
              placeholder="https://res.cloudinary.com/.../image.jpg"
              hint="Cloudinary recommended for best performance."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FormField
              label="Priority (0–100)"
              name="priority"
              type="number"
              defaultValue="10"
              hint="Higher wins ties. House ads default at 10; boosts run at 7."
            />
            <FormField
              label="City scope (optional)"
              name="city"
              maxLength={80}
              placeholder="Douala — leave blank for global"
            />
          </div>

          <button
            type="submit"
            className="mt-2 inline-flex items-center gap-2 rounded-lg bg-purple-600 hover:bg-purple-500 px-5 py-2.5 text-sm font-semibold transition"
          >
            <Plus size={14} strokeWidth={2.5} />
            Create ad
          </button>
        </form>
      </section>

      {/* HOUSE ADS */}
      <section className="mb-10">
        <h2 className="text-sm font-bold uppercase tracking-widest text-white/40 mb-3 flex items-center gap-2">
          <Megaphone size={14} strokeWidth={2.4} />
          House ads — {houseAds.length}
        </h2>

        <div className="space-y-3">
          {houseAds.length === 0 && (
            <p className="text-white/50 text-sm">
              No house ads yet. Create one above to put a brand promo in the
              homepage sponsored slot.
            </p>
          )}

          {houseAds.map((ad) => (
            <AdRow
              key={ad.id}
              ad={{
                id: ad.id,
                status: ad.status,
                priority: ad.priority,
                title: ad.title,
                body: ad.body,
                ctaLabel: ad.ctaLabel,
                ctaUrl: ad.ctaUrl,
                imageUrl: ad.imageUrl,
                city: ad.city,
                createdAt: ad.createdAt,
                impressions: ad.impressions,
                clicks: ad.clicks,
              }}
            />
          ))}
        </div>
      </section>

      {/* PROMOTED CREATOR ADS */}
      <section>
        <h2 className="text-sm font-bold uppercase tracking-widest text-white/40 mb-3 flex items-center gap-2">
          <Crown size={14} strokeWidth={2.4} />
          Promoted creators — {creatorAds.length}
        </h2>
        <p className="text-xs text-white/45 mb-3">
          Created automatically when a boost is approved at{" "}
          <Link
            href="/admin/boosts"
            className="text-purple-300 underline underline-offset-2"
          >
            /admin/boosts
          </Link>
          . Pausing here is for emergency take-downs only.
        </p>

        <div className="space-y-3">
          {creatorAds.length === 0 && (
            <p className="text-white/50 text-sm">
              No active or past promoted creators yet.
              {activeBoostCount > 0 && (
                <>
                  {" "}
                  ({activeBoostCount} active boosts may not have ads linked.)
                </>
              )}
            </p>
          )}

          {creatorAds.map((ad) => (
            <AdRow
              key={ad.id}
              ad={{
                id: ad.id,
                status: ad.status,
                priority: ad.priority,
                title: ad.title,
                body: ad.body,
                ctaLabel: ad.ctaLabel,
                ctaUrl: ad.ctaUrl,
                imageUrl: ad.imageUrl,
                city: ad.city,
                createdAt: ad.createdAt,
                impressions: ad.impressions,
                clicks: ad.clicks,
                creatorName: ad.creatorprofile?.displayName,
                boostStatus: ad.boost?.status,
              }}
              readOnlyDelete
            />
          ))}
        </div>
      </section>
    </div>
  );
}

// ── Bits ─────────────────────────────────────────────────────

function FormField({
  label,
  name,
  type = "text",
  required,
  maxLength,
  placeholder,
  defaultValue,
  hint,
  textarea,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  maxLength?: number;
  placeholder?: string;
  defaultValue?: string;
  hint?: string;
  textarea?: boolean;
}) {
  const inputClass =
    "w-full rounded-md bg-black/40 border border-white/12 px-3 py-2 text-sm placeholder:text-white/30 focus:outline-none focus:border-purple-500/50";
  return (
    <label className="block">
      <span className="block text-[11px] font-bold tracking-[0.10em] text-white/55 mb-1.5">
        {label.toUpperCase()}
        {required && <span className="text-rose-300 ml-1">*</span>}
      </span>
      {textarea ? (
        <textarea
          name={name}
          rows={2}
          required={required}
          maxLength={maxLength}
          placeholder={placeholder}
          defaultValue={defaultValue}
          className={`${inputClass} resize-none`}
        />
      ) : (
        <input
          type={type}
          name={name}
          required={required}
          maxLength={maxLength}
          placeholder={placeholder}
          defaultValue={defaultValue}
          className={inputClass}
        />
      )}
      {hint && (
        <span className="block text-[10px] text-white/35 mt-1 leading-snug">
          {hint}
        </span>
      )}
    </label>
  );
}

function AdRow({
  ad,
  readOnlyDelete,
}: {
  ad: {
    id: number;
    status: string;
    priority: number;
    title: string;
    body: string | null;
    ctaLabel: string;
    ctaUrl: string;
    imageUrl: string | null;
    city: string | null;
    createdAt: Date;
    impressions: number;
    clicks: number;
    creatorName?: string | null;
    boostStatus?: string | null;
  };
  readOnlyDelete?: boolean;
}) {
  const isPaused = ad.status === "PAUSED";
  return (
    <div
      className={`rounded-xl border p-4 ${
        isPaused
          ? "border-white/10 bg-white/3 opacity-70"
          : "border-white/12 bg-white/5"
      }`}
    >
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <p className="font-semibold">
          {ad.title}{" "}
          <span className="text-xs text-white/35 font-normal">
            #{ad.id} · priority {ad.priority}
          </span>
          {isPaused && (
            <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-white/8 border border-white/15 px-2 py-0.5 text-[10px] font-bold tracking-[0.10em] text-white/65">
              PAUSED
            </span>
          )}
          {ad.creatorName && (
            <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-500/12 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold tracking-[0.10em] text-amber-200">
              <Crown size={10} strokeWidth={2.5} />
              {ad.creatorName}
            </span>
          )}
        </p>
        <p className="text-xs text-white/40">Created {fmt(ad.createdAt)}</p>
      </div>

      {ad.body && (
        <p className="text-sm text-white/70 mt-2 leading-relaxed">{ad.body}</p>
      )}

      <div className="mt-2 text-xs text-white/45 flex flex-wrap gap-x-4 gap-y-1">
        <span>
          <span className="text-white/30">CTA:</span> {ad.ctaLabel} →{" "}
          <span className="font-mono text-white/70">{ad.ctaUrl}</span>
        </span>
        {ad.city && (
          <span>
            <span className="text-white/30">City:</span> {ad.city}
          </span>
        )}
        <span>
          <span className="text-white/30">Impressions:</span>{" "}
          <span className="text-white/70 tabular-nums">{ad.impressions}</span>
        </span>
        <span>
          <span className="text-white/30">Clicks:</span>{" "}
          <span className="text-white/70 tabular-nums">{ad.clicks}</span>
        </span>
      </div>

      <div className="mt-3 flex gap-2 flex-wrap">
        {isPaused ? (
          <form action={resumeAd}>
            <input type="hidden" name="adId" value={ad.id} />
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 text-xs font-semibold transition"
            >
              <Play size={11} strokeWidth={2.5} fill="currentColor" />
              Resume
            </button>
          </form>
        ) : (
          <form action={pauseAd}>
            <input type="hidden" name="adId" value={ad.id} />
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-md border border-white/15 hover:border-white/35 px-3 py-1.5 text-xs font-medium text-white/75 hover:text-white transition"
            >
              <Pause size={11} strokeWidth={2.5} />
              Pause
            </button>
          </form>
        )}

        {!readOnlyDelete && (
          <form action={deleteAd}>
            <input type="hidden" name="adId" value={ad.id} />
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-md border border-rose-500/35 text-rose-300 hover:bg-rose-500/10 px-3 py-1.5 text-xs font-medium transition"
            >
              <Trash2 size={11} strokeWidth={2.5} />
              Delete
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
