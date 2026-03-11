import Link from "next/link";
import CreatorCard from "../components/CreatorCard";
import { creators } from "../../data/creators";

export default async function Explore({
    searchParams,
}: {
    searchParams: Promise<{ city?: string; category?: string }>;
}) {
    const { city, category } = await searchParams;

    if (!city) {
        return (
            <main className="max-w-7xl mx-auto px-6 py-10">
                <h1 className="text-3xl font-bold mb-2">Creators in your city</h1>
                <p className="text-white/60">No city selected. Go back and choose a city.</p>
            </main>
        );
    }

    const cityCreators = creators.filter(
        (c) => c.city.toLowerCase() === city.toLowerCase()
    );

    const allCategories = Array.from(
        new Set(cityCreators.flatMap((c) => c.categories ?? []))
    ).sort();

    const selectedCategory = category?.trim();

    const filteredCreators =
        selectedCategory && selectedCategory !== "All"
            ? cityCreators.filter((c) => (c.categories ?? []).includes(selectedCategory))
            : cityCreators;

    const makeHref = (cat?: string) => {
        const qs = new URLSearchParams({ city });
        if (cat && cat !== "All") qs.set("category", cat);
        return `/explore?${qs.toString()}`;
    };

    return (
        <main className="max-w-7xl mx-auto px-6 py-10">
            <h1 className="text-3xl font-bold mb-4">Creators in {city}</h1>

            {/* Category chips */}
            <div className="flex flex-wrap gap-2 mb-6">
                <Link
                    href={makeHref("All")}
                    className={`text-sm px-3 py-2 rounded-full border border-white/10 ${!selectedCategory ? "bg-white/15" : "bg-white/5 hover:bg-white/10"
                        }`}
                >
                    All
                </Link>

                {allCategories.map((cat) => (
                    <Link
                        key={cat}
                        href={makeHref(cat)}
                        className={`text-sm px-3 py-2 rounded-full border border-white/10 ${selectedCategory === cat
                                ? "bg-white/15"
                                : "bg-white/5 hover:bg-white/10"
                            }`}
                    >
                        {cat}
                    </Link>
                ))}
            </div>

            {/* Results */}
            {filteredCreators.length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-white/5 p-6">
                    <p className="text-white/80">
                        No creators found for {city}
                        {selectedCategory ? ` in ${selectedCategory}` : ""}.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredCreators.map((c) => (
                        <CreatorCard key={c.id} creator={c} />
                    ))}
                </div>
            )}
        </main>
    );
}
