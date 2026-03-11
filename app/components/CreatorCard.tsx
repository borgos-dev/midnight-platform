import Link from "next/link";
import Image from "next/image";
import type { Creator } from "@/app/types/creator";


export default function CreatorCard({ creator }: { creator: Creator }) {
    const cover = creator.photos?.[0];

    return (
        <Link
        
            href={`/creator/${creator.id}`}
            className="block rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition overflow-hidden"
        >
            {/* Thumbnail */}
            <div className="relative w-full h-44 bg-white/5">
                {cover ? (
                    <Image
                        src={cover}
                        alt={`${creator.name} cover`}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        priority={false}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/50 text-sm">
                        No photo
                    </div>
                )}
            </div>

            <div className="p-4">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-lg">{creator.name}</h3>

                            {creator.verified && (
                                <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-300">
                                    Verified
                                </span>
                            )}

                            <span className="text-xs px-2 py-1 rounded-full bg-white/10 text-white/80">
                                21+
                            </span>
                        </div>

                        <p className="text-sm text-white/60">{creator.city}</p>
                    </div>

                    <span className="text-sm text-white/70">View →</span>
                </div>

                {/* Categories */}
                <div className="mt-3 flex flex-wrap gap-2">
                    {creator.categories?.slice(0, 4).map((c: string) => (
                        <span
                            key={c}
                            className="text-xs px-2 py-1 rounded-full bg-purple-500/15 text-purple-200 border border-purple-500/20"
                        >
                            {c}
                        </span>
                    ))}
                </div>

                {/* Tags */}
                <div className="mt-3 flex flex-wrap gap-2">
                    {creator.tags?.slice(0, 3).map((t: string) => (
                        <span key={t} className="text-xs px-2 py-1 rounded-full bg-white/10 text-white/70">
                            {t}
                        </span>
                    ))}
                </div>
            </div>
        </Link>
    );
}
