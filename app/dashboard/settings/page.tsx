import { auth } from "@/auth";
import { redirect } from "next/navigation";
import DeleteAccountButton from "../components/DeleteAccountButton";

/**
 * Account-level settings page. Currently hosts the Danger Zone (delete
 * account). Future home for email preferences, notification toggles,
 * password change link, and other account-wide controls that don't
 * belong inside the profile editor.
 *
 * Lives under /dashboard/settings so it's discoverable from the sidebar
 * instead of buried inside Edit Profile. The sidebar entry is in the
 * dashboard layout's navItems list.
 */
export default async function DashboardSettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-lg font-semibold text-white tracking-tight">
          Settings
        </h1>
        <p className="text-[12px] text-white/35 mt-1">
          Account-level controls. Profile fields live under Edit Profile.
        </p>
      </div>

      {/* Danger zone — separated visually so it doesn't get tapped while
          scanning. The Delete button itself has a browser-native confirm()
          dialog for one more layer of friction before account deletion
          actually fires. */}
      <section className="rounded-xl border border-rose-500/25 bg-rose-500/5 p-5 space-y-3">
        <div>
          <h2 className="text-[13px] font-semibold text-rose-200 tracking-tight">
            Danger zone
          </h2>
          <p className="text-[12px] text-white/55 mt-1 leading-relaxed">
            Deleting your account soft-removes your profile, posts,
            external links, and analytics history. Your email is reserved
            so it can&apos;t be re-registered. <strong>This cannot be
            undone.</strong>
          </p>
        </div>
        <DeleteAccountButton />
      </section>
    </div>
  );
}
