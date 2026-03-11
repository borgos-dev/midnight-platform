"use client";

import { useMemo, useState } from "react";
import CreatorCard from "./CreatorCard";
import type { Creator } from "@/app/types/creator";

export default function HomeClient({ creators }: { creators: Creator[] }) {
    const [city, setCity] = useState("");
    const [category, setCategory] = useState("");

    const cities = useMemo(
        () => Array.from(new Set(creators.map((c) => c.city))).sort(),
        [creators]
    );

    const categories = useMemo(
        () => Array.from(new Set(creators.flatMap((c) => c.categories ?? []))).sort(),
        [creators]
    );

    const filteredCreators = useMemo(() => {
        return creators.filter((c) => {
            const cityOk = city ? c.city.toLowerCase() === city.toLowerCase() : true;
            const categoryOk = category ? (c.categories ?? []).includes(category) : true;
            return cityOk && categoryOk;
        });
    }, [creators, city, category]);

    return (
        <div className="space-y-6">
            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full bg-black border border-white/20 rounded-md px-4 py-3 text-white"
                >
                    <option value="">All cities</option>
                    {cities.map((c) => (
                        <option key={c} value={c}>
                            {c}
                        </option>
                    ))}
                </select>

                <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-black border border-white/20 rounded-md px-4 py-3 text-white"
                >
                    <option value="">All categories</option>
                    {categories.map((cat) => (
                        <option key={cat} value={cat}>
                            {cat}
                        </option>
                    ))}
                </select>

                <button
                    onClick={() => {
                        setCity("");
                        setCategory("");
                    }}
                    className="w-full bg-white/10 hover:bg-white/15 transition px-4 py-3 rounded-md font-semibold border border-white/10"
                >
                    Reset
                </button>
            </div>

            {/* Results */}
            {filteredCreators.length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-white/70">
                    No creators match your filters.
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredCreators.map((creator) => (
                        <CreatorCard key={creator.id} creator={creator} />
                    ))}
                </div>
            )}
        </div>
    );
}
