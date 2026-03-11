"use client";

export default function CityFilter({ selectedCity }: { selectedCity: string }) {
  const cities = ["Douala", "Yaoundé", "Buea"];

  return (
    <div className="mb-6">
      <select
        value={selectedCity}
        onChange={(e) => {
          const value = e.target.value;
          if (value) {
            window.location.href = `/?city=${value}`;
          } else {
            window.location.href = "/";
          }
        }}
        className="rounded-lg bg-black/40 border border-white/20 px-4 py-2"
      >
        <option value="">All Cities</option>
        {cities.map((city) => (
          <option key={city} value={city}>
            {city}
          </option>
        ))}
      </select>
    </div>
  );
}