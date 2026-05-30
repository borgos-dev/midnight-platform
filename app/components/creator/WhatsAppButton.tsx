"use client";

import { useEffect } from "react";
import { Button } from "@/app/components/ui/Button";
import {
  recordVariantClick,
  recordVariantExposure,
  type PrimaryVariant,
} from "@/app/lib/ab";

type Props = {
  whatsappLink: string;
  creatorId: number;
  isVipPlus: boolean;
  /**
   * Which primary CTA arm to render when the button is NOT in VIP+ gold
   * mode. Server determines the bucket via getPrimaryButtonVariant() and
   * passes it down. Defaults to "primary" (control) for safety.
   */
  primaryVariant?: PrimaryVariant;
};

export function WhatsAppButton({
  whatsappLink,
  creatorId,
  isVipPlus,
  primaryVariant = "primary",
}: Props) {
  // Record exposure once when this CTA renders. VIP+ viewers are bucketed
  // too — even though they see the gold variant, exposure tracks "this
  // user saw the primary CTA on this creator's profile."
  // Server-side dedup (30min per visitor/creator/event) prevents spam.
  useEffect(() => {
    recordVariantExposure(creatorId, primaryVariant);
  }, [creatorId, primaryVariant]);

  const handleClick = () => {
    recordVariantClick(creatorId, "whatsapp_click", primaryVariant);
    window.open(whatsappLink, "_blank");
  };

  return (
    <Button
      onClick={handleClick}
      variant={isVipPlus ? "gold" : primaryVariant}
      fullWidth
    >
      Contact on WhatsApp
    </Button>
  );
}
