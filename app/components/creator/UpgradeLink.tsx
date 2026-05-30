"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Lock } from "lucide-react";
import { buttonClasses } from "@/app/components/ui/Button";
import {
  recordVariantClick,
  recordVariantExposure,
  type PrimaryVariant,
} from "@/app/lib/ab";

type Props = {
  creatorId: number;
  primaryVariant: PrimaryVariant;
};

/**
 * The "Unlock WhatsApp Contact (VIP+)" CTA shown to non-VIP+ viewers on
 * a creator's profile. Wraps a Next/Link styled with the design system's
 * primary button look, and fires the A/B test exposure + click events so
 * we can measure conversion (upgrade_click / cta_exposure) per arm.
 */
export function UpgradeLink({ creatorId, primaryVariant }: Props) {
  useEffect(() => {
    recordVariantExposure(creatorId, primaryVariant);
  }, [creatorId, primaryVariant]);

  return (
    <Link
      href="/upgrade"
      onClick={() => recordVariantClick(creatorId, "upgrade_click", primaryVariant)}
      className={`${buttonClasses(primaryVariant, "md", true)} inline-flex items-center justify-center gap-2`}
    >
      <Lock size={16} />
      Unlock WhatsApp Contact (VIP+)
    </Link>
  );
}
