import { redirect } from "next/navigation";

// /profile previously rendered a "Creator Editor (next)" TODO stub.
// The real editor lives at /dashboard/profile; this route exists only
// so old links and inbound traffic land in the right place.
export default function ProfileRedirect() {
  redirect("/dashboard/profile");
}
