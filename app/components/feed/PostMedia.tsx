"use client";

type Props = {
  media: string;
  locked: boolean;
};

export default function PostMedia({ media, locked }: Props) {
  const isVideo = media.endsWith(".mp4") || media.endsWith(".webm");

  return (
    <div className="relative w-full overflow-hidden">
      {isVideo ? (
        <video
          src={media}
          autoPlay
          muted
          loop
          playsInline
          className={`w-full object-cover ${
            locked ? "blur-xl scale-105" : ""
          }`}
        />
      ) : (
        <img
          src={media}
          alt="Post media"
          className={`w-full object-cover ${
            locked ? "blur-xl scale-105" : ""
          }`}
        />
      )}
    </div>
  );
}

