type CreatorStatsProps = {
  postsCount: number;
  subscribersCount: number;
  likesCount: number;
  isVerified?: boolean;
};

export default function CreatorStats({
  postsCount,
  subscribersCount,
  likesCount,
  isVerified = false,
}: CreatorStatsProps) {
  return (
    <div className="flex justify-around border-b py-4 text-center">
      <div>
        <strong className="block text-lg">{postsCount}</strong>
        <span className="text-sm text-gray-500">Posts</span>
      </div>

      <div>
        <strong className="block text-lg">{subscribersCount}</strong>
        <span className="text-sm text-gray-500">Subscribers</span>
      </div>

      <div>
        <strong className="block text-lg">{likesCount}</strong>
        <span className="text-sm text-gray-500">Likes</span>
      </div>

      {isVerified && (
        <div className="flex flex-col items-center justify-center">
          <span className="text-blue-500 text-lg">✔</span>
          <span className="text-xs text-gray-500">Verified</span>
        </div>
      )}
    </div>
  );
}
