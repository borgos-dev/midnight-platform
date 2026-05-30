"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  UserCheck,
  BadgeCheck,
  CreditCard,
  TrendingUp,
  Flag,
  Megaphone,
  MessageSquareText,
  Sparkles,
  History,
  LogOut,
  Menu,
  X,
  ArrowUpRight,
} from "lucide-react";
import { useState } from "react";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  /** Live count badge — only rendered when > 0. Hidden on the dashboard
   *  row since the dashboard itself shows all the counts. */
  count?: number;
};

type Props = {
  counts: {
    pendingCreators: number;
    pendingSubscriptions: number;
    pendingBoosts: number;
    pendingReports: number;
    pendingReviews: number;
  };
  /** Optional name of the logged-in admin so the sidebar can greet them. */
  adminName?: string | null;
};

/**
 * Persistent sidebar for every /admin/* page.
 *
 * On desktop: fixed left rail, always visible.
 * On mobile: collapsed behind a hamburger button; drawer slides in from
 * the left when toggled. Body scroll is locked while the drawer is open
 * (same pattern as the public Navbar).
 *
 * Each nav item carries a live count badge for queues that have pending
 * items, so the admin notices new work without having to open each queue.
 * Counts are passed in from the layout (server-fetched once per request).
 */
export function AdminSidebar({ counts, adminName }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const items: NavItem[] = [
    {
      href: "/admin",
      label: "Dashboard",
      icon: <LayoutDashboard size={16} strokeWidth={2.2} />,
    },
    {
      href: "/admin/creators-pending",
      label: "Approvals",
      icon: <UserCheck size={16} strokeWidth={2.2} />,
      count: counts.pendingCreators,
    },
    {
      href: "/admin/creators",
      label: "Verifications",
      icon: <BadgeCheck size={16} strokeWidth={2.2} />,
    },
    {
      href: "/admin/subscriptions",
      label: "Subscriptions",
      icon: <CreditCard size={16} strokeWidth={2.2} />,
      count: counts.pendingSubscriptions,
    },
    {
      href: "/admin/founding-creators",
      label: "Founding",
      icon: <Sparkles size={16} strokeWidth={2.2} />,
    },
    {
      href: "/admin/boosts",
      label: "Boosts",
      icon: <TrendingUp size={16} strokeWidth={2.2} />,
      count: counts.pendingBoosts,
    },
    {
      href: "/admin/reports",
      label: "Reports",
      icon: <Flag size={16} strokeWidth={2.2} />,
      count: counts.pendingReports,
    },
    {
      href: "/admin/reviews",
      label: "Reviews",
      icon: <MessageSquareText size={16} strokeWidth={2.2} />,
      count: counts.pendingReviews,
    },
    {
      href: "/admin/ads",
      label: "Ads",
      icon: <Megaphone size={16} strokeWidth={2.2} />,
    },
    {
      href: "/admin/audit",
      label: "Audit log",
      icon: <History size={16} strokeWidth={2.2} />,
    },
  ];

  // Helper: is this nav item the currently active route?
  // `/admin` matches only an exact pathname so it doesn't light up on
  // every sub-page; deeper routes use prefix match.
  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  // Body content shared between desktop sidebar + mobile drawer. Defined
  // inside the component so it captures the closure variables.
  const nav = (
    <>
      <div className="px-5 pt-6 pb-5 border-b border-white/8">
        <Link
          href="/admin"
          className="flex items-center gap-2"
          onClick={() => setOpen(false)}
        >
          <Image
            src="/Midnight-logo1.png"
            alt="Midnight"
            width={104}
            height={28}
            priority
            style={{ height: "auto" }}
          />
          <span className="text-[10px] font-bold tracking-[0.14em] text-amber-300 ml-1">
            ADMIN
          </span>
        </Link>
        {adminName && (
          <p className="mt-2 text-xs text-white/45 truncate">
            Signed in as <span className="text-white/70">{adminName}</span>
          </p>
        )}
      </div>

      <nav className="flex-1 p-3 overflow-y-auto" aria-label="Admin navigation">
        {items.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 mb-1 text-sm transition ${
                active
                  ? "bg-purple-500/15 text-white border border-purple-500/30"
                  : "text-white/65 hover:text-white hover:bg-white/5 border border-transparent"
              }`}
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <span
                  className={
                    active ? "text-purple-300" : "text-white/45"
                  }
                >
                  {item.icon}
                </span>
                <span className="truncate">{item.label}</span>
              </span>
              {item.count !== undefined && item.count > 0 && (
                <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-200 text-label font-bold tabular-nums">
                  {item.count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-white/8 space-y-1">
        <Link
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-white/55 hover:text-white hover:bg-white/5 transition"
        >
          <ArrowUpRight size={15} strokeWidth={2.2} />
          View public site
        </Link>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-white/55 hover:text-white hover:bg-white/5 transition"
        >
          <LogOut size={15} strokeWidth={2.2} />
          Sign out
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile top bar with hamburger. Only visible <md. */}
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-black border-b border-white/8">
        <Link href="/admin" className="flex items-center gap-2">
          <Image
            src="/Midnight-logo1.png"
            alt="Midnight"
            width={88}
            height={24}
            style={{ height: "auto" }}
          />
          <span className="text-[10px] font-bold tracking-[0.14em] text-amber-300">
            ADMIN
          </span>
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open admin menu"
          className="rounded-md border border-white/12 p-1.5 text-white/70 hover:text-white hover:border-white/30 transition"
        >
          <Menu size={18} strokeWidth={2.4} />
        </button>
      </header>

      {/* Desktop sidebar — sticky on md+. */}
      <aside className="hidden md:flex md:flex-col w-60 shrink-0 bg-[#0a0a0f] border-r border-white/8 min-h-screen sticky top-0">
        {nav}
      </aside>

      {/* Mobile drawer overlay. Shown when `open` is true. */}
      {open && (
        <>
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/65 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <aside
            className="md:hidden fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] flex flex-col bg-[#0a0a0f] border-r border-white/10 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-label="Admin menu"
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="absolute top-3 right-3 rounded-md border border-white/12 p-1.5 text-white/70 hover:text-white hover:border-white/30 transition"
            >
              <X size={16} strokeWidth={2.4} />
            </button>
            {nav}
          </aside>
        </>
      )}
    </>
  );
}
