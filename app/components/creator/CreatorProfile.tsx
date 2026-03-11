import CreatorHeader from "./CreatorHeader";
import CreatorStats from "./CreatorStats";
import CreatorFeed from "./CreatorFeed";
import BookingCTA from "./BookingCTA";
import CreatorBio from "./CreatorBio";
import { AccessLevel } from "@prisma/client";

function mapToAccessLevel(t: string | undefined): AccessLevel {
  if (!t) return AccessLevel.REGULAR;
  if (t === "vip") return AccessLevel.VIP;
  if (t === "vip_plus") return AccessLevel.VIP_PLUS;
  return AccessLevel.REGULAR;
}

export default function CreatorProfile({
  userTier = "visitor",
}: {
  userTier?: "visitor" | "free" | "vip" | "vip_plus";
}) {
  const accessTier = mapToAccessLevel(userTier);
  return (
    <div className="max-w-4xl mx-auto p-4">
      <CreatorHeader
        name="John Fitness"
        avatar="/avatars/john.jpg"
        category="Fitness Coach"
        location="Douala, Cameroon"
        userTier={accessTier}
      />
      <CreatorBio
  bio="Professional content creator with 5+ years of experience."
  categories={["Lifestyle", "Fitness", "Motivation"]}
  services={[
    "1-on-1 Booking",
    "Sponsored Content",
    "Private Sessions",
  ]}
  location="Douala, Cameroon"
/>


      <CreatorStats
        postsCount={120}
        subscribersCount={340}
        likesCount={890}
        isVerified
      />
      <BookingCTA
  phone="237612345678"
  creatorName="E.G Kitchen"
/>


      <CreatorFeed userTier={accessTier} />
    </div>
  );
}
