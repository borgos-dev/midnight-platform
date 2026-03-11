import type { ReactNode } from "react";
import Link from "next/link";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: "□" },
  { label: "Edit Profile", href: "/dashboard/profile", icon: "✎" },
  { label: "My Posts", href: "/dashboard/media", icon: "▦" },
  { label: "Subscription", href: "/upgrade/checkout", icon: "◈" },
  { label: "Support", href: "mailto:support@midnight247.com", icon: "?" },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-black text-white flex">
      {/* ───── SIDEBAR ───── */}
      <aside className="w-[240px] shrink-0 bg-[#0a0a0f] border-r border-white/[0.06] flex flex-col">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 pt-7 pb-8">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-600 to-violet-500 flex items-center justify-center text-[10px] font-bold tracking-tight">
            M
          </div>
          <span className="font-semibold text-[13px] text-white/90 tracking-tight">
            Midnight24/7
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-0.5">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] text-white/50 hover:text-white hover:bg-white/[0.04] transition-colors"
            >
              <span className="text-[14px] w-5 text-center opacity-60">
                {item.icon}
              </span>
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Logout */}
        <div className="px-3 pb-6 pt-4 border-t border-white/[0.06] mt-auto">
          <Link
            href="/api/auth/signout"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] text-white/40 hover:text-red-400 hover:bg-white/[0.04] transition-colors"
          >
            <span className="text-[14px] w-5 text-center opacity-60">⏻</span>
            Log out
          </Link>
        </div>
      </aside>

      {/* ───── MAIN ───── */}
      <main className="flex-1 bg-[#050507] overflow-y-auto">
        <div className="max-w-5xl mx-auto px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}