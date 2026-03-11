import CreatorGrid from "./components/CreatorGrid";
import CityFilter from "./components/CityFilter";
import Feed from "./components/feed/Feed";

type Props = {
  searchParams: Promise<{
    city?: string;
    page?: string;
    view?: string;
  }>;
};

export default async function Page({ searchParams }: Props) {
  const resolvedSearchParams = await searchParams;
  const selectedCity = resolvedSearchParams?.city ?? "";
  const currentPage = Number(resolvedSearchParams?.page ?? "1");
  const currentView = resolvedSearchParams?.view ?? "gallery";

  return (
    <main className="min-h-[80vh] px-6 py-10">
      <div className="max-w-7xl mx-auto">
        <div className="max-w-md mb-8">
          <h1 className="text-4xl font-bold mb-4">
            Discover <span className="text-purple-500">Midnight24/7</span>
          </h1>

          <p className="text-gray-400">
            Find verified creators in your city. 21+ only.
          </p>
        </div>

        <CityFilter selectedCity={selectedCity} />

        {/* VIEW SWITCH */}
        <div className="flex gap-3 mb-8 mt-6">
          <a
            href={`/?city=${selectedCity}&page=${currentPage}&view=gallery`}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              currentView === "gallery"
                ? "bg-purple-600 text-white"
                : "bg-black/30 text-white/70"
            }`}
          >
            Gallery
          </a>

          <a
            href={`/?city=${selectedCity}&page=${currentPage}&view=feed`}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              currentView === "feed"
                ? "bg-purple-600 text-white"
                : "bg-black/30 text-white/70"
            }`}
          >
            Feed
          </a>
        </div>

        {/* CONTENT */}
        {currentView === "gallery" ? (
          <CreatorGrid
            selectedCity={selectedCity}
            currentPage={currentPage}
          />
        ) : (
          <Feed />
        )}
      </div>
    </main>
  );
}