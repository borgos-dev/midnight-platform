// app/components/dashboard/sections/LiveActivity.tsx
"use client";

import type { JSX } from "react";
import { AccessLevel } from "@prisma/client";

type LiveActivityProps = {
  tier: AccessLevel;
  location?: string | null;
};

type ActivityItem = {
  icon: string;
  iconColor: string;
  text: JSX.Element;
  time: string;
};

export function LiveActivity({ tier, location }: LiveActivityProps) {
  const isVip = tier === "VIP" || tier === "VIP_PLUS";
  const isVipPlus = tier === "VIP_PLUS";

  const city = location ?? "your city";

  // Simulated activity items — in production, replace with real event stream
  const activities: ActivityItem[] = [];

  if (isVip) {
    activities.push({
      icon: "💬",
      iconColor: "text-green-400",
      text: (
        <span>
          Visitor from <strong className="text-white">{city}</strong> clicked
          your <strong className="text-white">WhatsApp</strong>
        </span>
      ),
      time: "4 min ago",
    });
  }

  activities.push({
    icon: "👤",
    iconColor: "text-purple-400",
    text: (
      <span>
        Visitor from <strong className="text-white">Paris</strong> viewed your{" "}
        <strong className="text-white">Profile</strong>
      </span>
    ),
    time: "13 min ago",
  });

  if (isVipPlus) {
    activities.push({
      icon: "🔍",
      iconColor: "text-blue-400",
      text: (
        <span>
          <strong className="text-white">New discovery:</strong> You appeared in
          456 &quot;Luxury&quot; searches today
        </span>
      ),
      time: "25 min ago",
    });
  }

  // Fill empty slots for non-VIP
  if (!isVip) {
    activities.length = 0;
    activities.push(
      {
        icon: "👤",
        iconColor: "text-purple-400",
        text: (
          <span>
            Visitor from <strong className="text-white">{city}</strong> viewed
            your <strong className="text-white">Profile</strong>
          </span>
        ),
        time: "13 min ago",
      },
      {
        icon: "🔒",
        iconColor: "text-white/20",
        text: <span className="text-white/30">Upgrade to VIP to see WhatsApp clicks</span>,
        time: "",
      },
      {
        icon: "🔒",
        iconColor: "text-white/20",
        text: <span className="text-white/30">Upgrade to VIP+ to see search appearances</span>,
        time: "",
      }
    );
  }

  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#0a0a12] p-5 h-full flex flex-col">
      <h2 className="text-[13px] font-semibold text-white/80 mb-4">
        Live Activity
      </h2>

      <div className="flex-1 space-y-4">
        {activities.map((item, i) => (
          <div key={i} className="flex items-start gap-3">
            <span className={`text-base mt-0.5 ${item.iconColor}`}>
              {item.icon}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] text-white/60 leading-relaxed">
                {item.text}
              </p>
              {item.time && (
                <p className="text-[10px] text-white/25 mt-0.5">{item.time}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
