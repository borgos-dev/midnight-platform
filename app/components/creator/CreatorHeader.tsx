import { AccessLevel } from "@prisma/client";

type CreatorHeaderProps = {
  name: string;
  avatar: string;
  category: string;
  location?: string;
  userTier: AccessLevel;
};

export default function CreatorHeader({
  name,
  avatar,
  category,
  location,
  userTier,
}: CreatorHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-4 mb-6">
      {/* LEFT */}
      <div className="flex items-center gap-4">
        <img
          src={avatar}
          alt={name}
          className="h-16 w-16 rounded-full object-cover"
        />

        <div>
          <h2 className="text-lg font-bold">{name}</h2>
          <p className="text-sm text-gray-500">{category}</p>
          {location && (
            <p className="text-xs text-gray-400">{location}</p>
          )}
        </div>
      </div>

      {/* RIGHT */}
      <div className="flex flex-col items-end gap-2">
        <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700">
          Verified Creator
        </span>

        <button className="rounded-full bg-green-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-green-700">
          Book via WhatsApp
        </button>
      </div>
    </div>
  );
}
