import { canViewPost,getCTA} from "@/app/lib/access";
import { AccessLevel } from "@prisma/client";


type Post = {
  id: number;
  title: string;
  image: string;
  accessLevel: AccessLevel;
};

type FeedCardProps = {
  post: Post;
  
  userTier: AccessLevel;
};

export default function FeedCard({ post, userTier }: FeedCardProps) {
  // 🔐 Access logic (single source of truth)
  const isLocked = !canViewPost(userTier, post.accessLevel);
  const cta = getCTA(userTier, post.accessLevel);

  return (
    <div className="relative overflow-hidden rounded-xl bg-white shadow">
      {/* IMAGE */}
      <img
        src={post.image}
        alt={post.title}
        className="h-48 w-full object-cover"
      />

      {/* POST TITLE */}
      <div className="p-3">
        <h3 className="text-sm font-semibold">{post.title}</h3>
      </div>

      {/* 🔒 LOCK OVERLAY */}
      {isLocked && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 px-4 text-center text-white">
          <p className="mb-3 text-sm font-semibold">
            {post.accessLevel === "VIP_PLUS"
              ? "VIP+ Exclusive Content"
              : "VIP Content"}
          </p>

          {cta && (
            <button className="rounded-full bg-white px-4 py-1.5 text-sm font-medium text-black hover:bg-gray-200 transition">
              {cta}
            </button>
          )}
        </div>
      )}
    </div>
  );
}