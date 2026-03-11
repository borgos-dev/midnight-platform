"use client";

import { useState } from "react";

type Props = {
  initialLikes: number;
};

export default function LikeButton({ initialLikes }: Props) {
  const [likes, setLikes] = useState(initialLikes);
  const [liked, setLiked] = useState(false);

  function toggleLike() {
    setLikes((prev) => (liked ? prev - 1 : prev + 1));
    setLiked(!liked);
  }

  return (
    <button
      onClick={toggleLike}
      className="flex items-center gap-2 text-sm text-white/80 hover:text-white"
    >
      <span className={`text-xl ${liked ? "text-red-500" : ""}`}>❤️</span>
      <span>{likes}</span>
    </button>
  );
}