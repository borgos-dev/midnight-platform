import { redirect } from "next/navigation";

// The previous /welcome page shipped an off-brand placeholder ("Account
// created ✅") that was never linked from any flow. Sign-up already sends
// users to /login (see app/api/become-a-member/route.ts). We keep the
// route reachable but redirect, so stale bookmarks don't 404.
export default function WelcomePage() {
  redirect("/login");
}
