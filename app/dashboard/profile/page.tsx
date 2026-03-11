import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ProfileForm from "./ProfileForm";

export default async function DashboardProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const creator = await prisma.creatorprofile.findUnique({
    where: { userId: Number(session.user.id) },
  });

  if (!creator) redirect("/");

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-white tracking-tight">
          Edit Profile
        </h1>
        <p className="text-[12px] text-white/35 mt-1">
          This information appears on your public creator profile.
        </p>
      </div>

      <ProfileForm
        creatorId={creator.id}
        defaultValues={{
          displayName: creator.displayName,
          bio: creator.bio ?? "",
          location: creator.location ?? "",
          whatsappNumber: creator.whatsappNumber ?? "",
          avatarUrl: creator.avatarUrl ?? null,
        }}
      />
    </div>
  );
}
  