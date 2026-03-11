import { Creator } from "@/app/types/creator";

export const creators: Creator[] = [
  {
    id: "1",
    name: "Luna Sparks",
    city: "Douala",
    image: "/creators/luna.jpg",
    whatsapp: "237670000000",
    bio: "Late night vibes. Private bookings only.",
    services: ["Private Session", "Photoshoot", "Video Call"],
    posts: [
      {
        id: "p1",
        media: "/posts/luna1.jpg",
        type: "image",
        locked: true,
        caption: "You’re watching but not touching 😌",
        likes: 34,
      },
      {
        id: "p2",
        media: "/posts/luna2.mp4",
        type: "video",
        locked: true,
        caption: "Say hi on WhatsApp 💋",
        likes: 58,
      },
    ],
  },
];