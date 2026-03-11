"use client";

import { useState, useTransition } from "react";
import { upgradeTierAction } from "./actions";

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
            {/* Trigger button (you can also move this into the header later) */}
            <button
                onClick={() => setOpen(true)}
                className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
            >
                Upgrade to VIP
            </button>

            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
                    <div className="w-full max-w-md rounded-2xl bg-slate-950 p-5 border border-slate-800">
                        <h2 className="text-base font-semibold text-slate-50">
                            Upgrade to VIP
                        </h2>

                        <p className="mt-3 text-sm text-slate-200">
                            VIP creators can post to the feed, appear more often in search,
                            and see how many visitors click their WhatsApp.
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                            This upgrade helps you turn profile views into real interest.
                        </p>

                        <ul className="mt-3 space-y-1 text-xs text-slate-200">
                            <li>✅ Post to the public feed</li>
                            <li>✅ Appear higher in search & categories</li>
                            <li>✅ See WhatsApp clicks</li>
                        </ul>

                        <div className="mt-4 flex justify-end gap-2">
                            <button
                                onClick={() => setOpen(false)}
                                className="rounded-full border border-slate-700 px-3 py-1.5 text-xs text-slate-200"
                                disabled={isPending}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirm}
                                className="rounded-full bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-white disabled:opacity-60"
                                disabled={isPending}
                            >
                                {isPending ? "Upgrading…" : "Confirm upgrade to VIP"}
                            </button>
                        </div>

                        <p className="mt-2 text-[10px] text-slate-500">
                            You can upgrade to VIP+ anytime.
                        </p>
                    </div>
                </div>
            )}
        </>
    );
}
