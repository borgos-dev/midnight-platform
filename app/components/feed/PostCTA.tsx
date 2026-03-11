"use client";

type Props = {
  creator: {
    name: string;
    whatsapp: string;
  };
};

export default function PostCTA({ creator }: Props) {
  const message = encodeURIComponent(
    `Hi ${creator.name}, I saw your post on Midnight24/7 and I'd like to book you.`
  );

  const whatsappLink = `https://wa.me/${creator.whatsapp}?text=${message}`;

  return (
    <div className="flex justify-between items-center pt-2">
      <button
        onClick={() => window.open(whatsappLink, "_blank")}
        className="w-full bg-purple-600 hover:bg-purple-700 transition text-white py-3 rounded-xl font-semibold"
      >
        🔓 Unlock · Contact on WhatsApp
      </button>
    </div>
  );
}
