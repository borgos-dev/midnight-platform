import Link from "next/link";
import type { Creator, CreatorTier } from "@/app/types/creator";
import CoverMedia from "./CoverMedia";

// Tier badge styling â€” uses brand gold (#E6A817 â†’ arbitrary value class)
// so VIP+ here matches every other "VIP+" surface in the app (profile
// avatar ring, dashboard chrome, signup gradient).
const TIER_BADGE: Record<Exclude<CreatorTier, "REGULAR">, { label: string; className: string }> = {
    VIP_PLUS: {
        label: "VIP+",
        className:
            "bg-brand-gold text-black shadow-md shadow-brand-gold/30",
    },
    VIP: {
        label: "VIP",
        className: "bg-brand-purple text-white shadow-md shadow-brand-purple/30",
    },
};

export default function CreatorCard({
    creator,
    priority = false,
}: {
    creator: Creator;
    priority?: boolean;
}) {
    const tierBadge =
        creator.tier && creator.tier !== "REGULAR" ? TIER_BADGE[creator.tier] : null;

    return (
        <Link
            href={`/creator/${creator.id}`}
            className="block rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition overflow-hidden"
        >
            {/* Thumbnail â€” 50vw on mobile (2-col grid), 33vw md, 25vw lg */}
            <div className="relative w-full h-44 bg-white/5">
                <CoverMedia
                    imageUrl={creator.photos?.[0] ?? null}
                    videoUrl={creator.coverVideoUrl ?? null}
                    alt={`${creator.name} cover`}
                    sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    priority={priority}
                />

                {tierBadge && (
                    <span
                        className={`absolute top-2 left-2 text-xs font-semibold px-2 py-1 rounded-full ${tierBadge.className}`}
                    >
                        {tierBadge.label}
                    </span>
                )}
            </div>

            <div className="p-4">
                <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-lg">{creator.name}</h3>

                    {creator.verified && (
                        <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-300">
                            Verified
                        </span>
                    )}

                    <span className="ml-auto text-eyebrow uppercase tracking-wide text-white/40">
                        18+
                    </span>
                </div>

                <p className="text-sm text-white/60 mt-1">{creator.city}</p>

                {/* Categories */}
                {creator.categories && creator.categories.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                        {creator.categories.slice(0, 4).map((c: string) => (
                            <span
                                key={c}
                                className="text-xs px-2 py-1 rounded-full bg-purple-500/15 text-purple-200 border border-purple-500/20"
                            >
                                {c}
                            </span>
                        ))}
                    </div>
                )}
            </div>
        </Link>
    );
}
