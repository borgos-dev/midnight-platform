"use client";

import { useState, useTransition } from "react";
import { Button } from "@/app/components/ui/Button";

type Props = {
    currentTier: "REGULAR" | "VIP" | "VIP_PLUS";
};

export function UpgradeToVipDialog({ currentTier }: Props) {
    const [open, setOpen] = useState(false);
    const [isPending, startTransition] = useTransition();

    if (currentTier !== "REGULAR") return null; // only show for Regular

    const handleConfirm = () => {
        startTransition(async () => {
            window.location.href = "/upgrade/checkout?plan=VIP";
            // simplest: hard reload for now so tier + UI update
            window.location.reload();
        });
    };

    return (
        <>
            {/* Trigger â€” secondary because the dashboard already has its
                own primary CTA (post upload). This button is a quieter
                upsell, not the screen's main action. */}
            <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
                Upgrade to VIP
            </Button>

            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
                    <div className="w-full max-w-md rounded-2xl bg-surface p-5 border border-white/8">
                        <h2 className="text-base font-semibold text-white">
                            Upgrade to VIP
                        </h2>

                        <p className="mt-3 text-sm text-white/70 max-w-prose">
                            VIP creators can post to the feed, appear more often in search,
                            and see how many visitors click their WhatsApp.
                        </p>
                        <p className="mt-1 text-eyebrow text-white/40 tracking-[0.04em]">
                            This upgrade helps you turn profile views into real interest.
                        </p>

                        <ul className="mt-3 space-y-1 text-label text-white/70">
                            <li>âœ… Post to the public feed</li>
                            <li>âœ… Appear higher in search &amp; categories</li>
                            <li>âœ… See WhatsApp clicks</li>
                        </ul>

                        <div className="mt-4 flex justify-end gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setOpen(false)}
                                disabled={isPending}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={handleConfirm}
                                loading={isPending}
                            >
                                Confirm upgrade to VIP
                            </Button>
                        </div>

                        <p className="mt-2 text-eyebrow text-white/35">
                            You can upgrade to VIP+ anytime.
                        </p>
                    </div>
                </div>
            )}
        </>
    );
}
