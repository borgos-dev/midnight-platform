import Link from "next/link";

export default function PostHeader({ creator }: any) {
  return (
    <Link href={`/creator/${creator.id}`}>
      <div className="flex items-center gap-3 cursor-pointer">
        <p className="font-semibold hover:underline">
          {creator.name}
        </p>
        <span className="text-sm text-gray-400">
          · {creator.location}
        </span>
      </div>
    </Link>
  );
}
