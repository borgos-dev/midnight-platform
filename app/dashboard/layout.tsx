"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  UserCog,
  Images,
  Crown,
  LifeBuoy,
  Settings,
  Menu,
  X,
  type LucideIcon,
} from "lucide-react";
import { LogoutButton } from "./components/LogoutButton";

type NavItem = { label: string; href: string; icon: LucideIcon };

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Edit Profile", href: "/dashboard/profile", icon: UserCog },
  { label: "My Posts", href: "/dashboard/media", icon: Images },
  // Points at the tier picker, not the checkout form, so creators see
  // every plan before being asked to pay. Each card on /upgrade routes
  // them to /upgrade/checkout?plan=X with the selection prefilled.
  { label: "Subscription", href: "/upgrade", icon: Crown },
  // Points at the in-platform Contact page so creators can reach us without
  // depending on a configured email client. Previously this was a mailto:
  // which silently failed for any creator without a default mail handler
  // (very common on web-only Cameroon devices).
  { label: "Support", href: "/contact", icon: LifeBuoy },
  // Account-level controls. Hosts the Danger Zone (delete account) so
  // it's discoverable from the sidebar without being inside Edit Profile,
  // and leaves room for future account-wide toggles.
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar on desktop resize
  useEffect(() => {
    const onResize = () => { if (window.innerWidth >= 768) setSidebarOpen(false); };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Lock body scroll when mobile sidebar is open
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [sidebarOpen]);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col md:flex-row">

      {/* ── Mobile Top Bar ── */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-[#0a0a0f] border-b border-white/6 sticky top-0 z-50">
        {/* Logo is the back-to-homepage link. Standard convention and the
            only way a creator can leave the dashboard now that the global
            navbar is hidden on /dashboard pages. */}
        <Link
          href="/"
          aria-label="Midnight — home"
          className="flex items-center gap-2.5 hover:opacity-90 transition-opacity"
        >
          <Image
            src="/Midnight-logo1.png"
            alt="Midnight"
            width={28}
            height={28}
            priority
            className="h-7 w-7 rounded-lg object-contain"
          />
          <span className="font-semibold text-[13px] text-white/90 tracking-tight">
            Midnight
          </span>
        </Link>
        <button
          onClick={() => setSidebarOpen(prev => !prev)}
          aria-label={sidebarOpen ? "Close menu" : "Open menu"}
          className="text-white/60 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/6"
          style={{ minWidth: "44px", minHeight: "44px", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* ── Mobile Sidebar Overlay backdrop ── */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── SIDEBAR ── */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-50
        w-60 shrink-0
        bg-[#0a0a0f] border-r border-white/6
        flex flex-col
        transition-transform duration-300 ease-in-out
        md:translate-x-0
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        md:min-h-screen
      `}>
        {/* Logo — desktop only (mobile uses top bar). Clickable: takes the
            creator back to the public homepage so they can see how their
            profile appears to visitors. The "Dashboard" nav item below
            handles staying inside the dashboard. */}
        <Link
          href="/"
          aria-label="Midnight — home"
          className="hidden md:flex items-center gap-2.5 px-5 pt-7 pb-8 hover:opacity-90 transition-opacity"
        >
          <Image
            src="/Midnight-logo1.png"
            alt="Midnight"
            width={32}
            height={32}
            priority
            className="h-8 w-8 rounded-lg object-contain"
          />
          <span className="font-semibold text-[13px] text-white/90 tracking-tight">
            Midnight
          </span>
        </Link>

        {/* Mobile sidebar header padding */}
        <div className="md:hidden pt-4" />

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-3 text-[13px] text-white/50 hover:text-white hover:bg-white/4 transition-colors"
              >
                <Icon size={16} className="opacity-60 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Logout — uses NextAuth's programmatic signOut so it skips the
            "Are you sure?" confirmation page and lands on /login per the
            launch-prep requirement. */}
        <div className="px-3 pb-6 pt-4 border-t border-white/6 mt-auto">
          <LogoutButton
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] text-white/40 hover:text-red-400 hover:bg-white/4 transition-colors w-full text-left"
          />
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main className="flex-1 bg-[#050507] overflow-y-auto min-w-0">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}