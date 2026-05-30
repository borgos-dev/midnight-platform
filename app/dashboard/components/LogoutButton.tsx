"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

type Props = {
  /** Tailwind classes for the visible element. The whole wrapper is a
   *  button so the click handler works consistently across breakpoints. */
  className?: string;
  /** Optional callback fired before signOut runs — used by the dashboard
   *  layout to close its mobile sidebar so the visitor doesn't briefly
   *  see the drawer hovering over the login page after redirect. */
  onClick?: () => void;
};

/**
 * Sign-out trigger used in the dashboard + admin sidebars.
 *
 * Why a client component (not a plain `<Link href="/api/auth/signout">`):
 * the GET endpoint shows NextAuth's "Are you sure?" confirmation page,
 * which is friction for a logged-in creator who tapped "Log out" on
 * purpose. Calling signOut() programmatically with a callbackUrl skips
 * the confirmation AND lands the visitor on /login afterwards, which
 * was the explicit launch-prep requirement.
 */
export function LogoutButton({ className, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={() => {
        onClick?.();
        // callbackUrl tells NextAuth where to send the browser after the
        // session cookies are cleared. /login is the right landing because
        // the user is no longer authenticated — sending to / would mean
        // their next click in the navbar tries to take them back to
        // wherever they were (which now 401s).
        void signOut({ callbackUrl: "/login" });
      }}
      className={className}
    >
      <LogOut size={16} className="opacity-60 shrink-0" />
      Log out
    </button>
  );
}
