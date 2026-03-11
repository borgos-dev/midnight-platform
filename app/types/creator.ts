export type Post = {
  id: string;
  media: string;
  type: "image" | "video";
  locked: boolean;
  blurred?: boolean;
  caption?: string;
  likes: number;
  isLiked?: boolean;
};

export type Creator = {
  id: string;
  name: string;
  city: string;
  image: string;
  whatsapp: string;

  // Profile info
  bio?: string;
  services: string[];
  posts: Post[];
  // additional fields used across components
  categories?: string[];
  tags?: string[];
  photos?: string[];

  // 🔐 Trust signals (MVP)
  verified?: boolean;        // blue badge
  price?: number;            // optional service price
};
