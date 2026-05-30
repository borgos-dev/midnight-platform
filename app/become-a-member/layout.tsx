import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Become a Creator — Join Midnight Cameroon",
  description:
    "Create your free profile on Midnight and get discovered by thousands of visitors across Douala, Yaoundé and Cameroon. Free to join. Upgrade when ready.",
  keywords: [
    "rejoindre Midnight Cameroun",
    "créer profil créatrice Douala",
    "devenir créatrice Yaoundé",
    "inscription créatrice Cameroun",
    "join midnight24",
    "creator signup Cameroon",
    "free creator profile Douala",
  ],
};

export default function BecomeAMemberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
