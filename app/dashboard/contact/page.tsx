import { redirect } from "next/navigation";

// WhatsApp number is now managed in /dashboard/profile
export default function DashboardContactPage() {
  redirect("/dashboard/profile");
}
  