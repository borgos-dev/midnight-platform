import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // 1️⃣ Not logged in → go to login
  if (!session?.user?.email) {
    redirect("/login");
  }

  // 2️⃣ Get user from DB
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  // 3️⃣ Not admin → block access
  if (user?.role !== "ADMIN") {
    redirect("/dashboard");
  }

  // 4️⃣ Admin → allow page
  return <>{children}</>;
}