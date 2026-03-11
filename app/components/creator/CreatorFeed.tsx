import FeedCard from "./FeedCard";
import { AccessLevel } from "@prisma/client";

type Post = {
  id: number;
  title: string;
  image: string;
  accessLevel: AccessLevel;
};

type CreatorFeedProps = {
  userTier: AccessLevel;
};

const MOCK_POSTS: Post[] = [
  { id: 1, title: "Behind the Scenes", image: "/posts/post1.jpg", accessLevel: AccessLevel.REGULAR },
  { id: 2, title: "VIP Workout Plan", image: "/posts/post2.jpg", accessLevel: AccessLevel.VIP },
  { id: 3, title: "VIP+ Private Session", image: "/posts/post3.jpg", accessLevel: AccessLevel.VIP_PLUS },
];

export default function CreatorFeed({ userTier }: CreatorFeedProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {MOCK_POSTS.map((post) => (
        <FeedCard key={post.id} post={post} userTier={userTier} />
      ))}
    </div>
  );
}
