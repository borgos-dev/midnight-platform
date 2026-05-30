"use client";

import { useState, useTransition } from "react";
import { grantFoundingTier } from "./actions";

type EligibleCreator = {
  id: number;
  displayName: string;
  email: string;
  currentTier: string;
  verified: boolean;
};

type Props = {
  creators: EligibleCreator[];
};

const DURATION_PRESETS = [30, 60, 90, 180];
const PLAN_OPTIONS = ["PREMIUM", "VIP", "VIP_PLUS"] as const;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Founding-creator grant form.
 *
 * Client-side state covers what the admin is *about to submit*:
 *   - selected creator (search-friendly dropdown)
 *   - tier (radio)
 *   - duration days (preset buttons + custom input)
 *   - mark-as-verified (auto-checks when tier=VIP_PLUS so the admin makes
 *     the attestation deliberate but doesn't have to remember to tick it)
 *
 * Server action does the real validation. This form is a thin convenience
 * shell — every field gets re-validated server-side.
 */
export function GrantForm({ creators }: Props) {
  const [creatorId, setCreatorId] = useState<string>("");
  const [plan, setPlan] = useState<(typeof PLAN_OPTIONS)[number]>("VIP_PLUS");
  const [durationDays, setDurationDays] = useState<number>(90);
  const [verifiedAuto, setVerifiedAuto] = useState(true);
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{
    kind: "ok" | "err";
    text: string;
  } | null>(null);

  // VIP+ requires verified=true on the checkout path; the admin is
  // implicitly vouching when they grant founding VIP+, so we surface
  // that as the default. They can untick if they want to grant tier
  // without the trust badge.
  const wantsVerified = plan === "VIP_PLUS" ? verifiedAuto : verifiedAuto;
  const endsPreview = new Date(Date.now() + durationDays * DAY_MS);
  const selectedCreator = creators.find(
    (c) => c.id.toString() === creatorId,
  );

  function handleSubmit(formData: FormData) {
    setFeedback(null);
    startTransition(async () => {
      const result = await grantFoundingTier(formData);
      if (result.ok) {
        setFeedback({
          kind: "ok",
          text: "Grant created. The creator is now on their founding tier.",
        });
        setCreatorId("");
      } else {
        setFeedback({ kind: "err", text: result.error });
      }
    });
  }

  return (
    <form
      action={handleSubmit}
      className="rounded-xl border border-white/10 bg-white/3 p-5 space-y-5"
    >
      <div>
        <h2 className="text-[14px] font-semibold text-white">Grant a tier</h2>
        <p className="text-xs text-white/45 mt-1 leading-relaxed">
          Creates a $0 active subscription. Tier resolution, expiry, and the
          auto-downgrade to Regular at the end date all work the same as a
          paid subscription.
        </p>
      </div>

      {/* Creator picker */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold tracking-[0.10em] uppercase text-white/45">
          Creator
        </label>
        <select
          name="creatorprofileId"
          value={creatorId}
          onChange={(e) => setCreatorId(e.target.value)}
          required
          className="w-full rounded-md bg-black/40 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500/40"
        >
          <option value="">
            {creators.length === 0
              ? "No eligible creators (all have active subscriptions)"
              : `Pick from ${creators.length} eligible creator${creators.length === 1 ? "" : "s"}…`}
          </option>
          {creators.map((c) => (
            <option key={c.id} value={c.id}>
              {c.displayName} · {c.email} · currently {c.currentTier}
              {c.verified ? " · verified" : ""}
            </option>
          ))}
        </select>
        {selectedCreator && (
          <p className="text-[11px] text-white/45">
            Currently <strong>{selectedCreator.currentTier}</strong>
            {selectedCreator.verified ? " · verified" : " · not verified"}
          </p>
        )}
      </div>

      {/* Plan */}
      <div className="space-y-2">
        <label className="text-[11px] font-bold tracking-[0.10em] uppercase text-white/45">
          Tier to grant
        </label>
        <div className="grid grid-cols-3 gap-2">
          {PLAN_OPTIONS.map((p) => {
            const active = plan === p;
            const color =
              p === "VIP_PLUS"
                ? "border-amber-400/60 bg-amber-400/15 text-amber-200"
                : p === "VIP"
                  ? "border-purple-500/60 bg-purple-500/15 text-purple-200"
                  : "border-rose-500/60 bg-rose-500/15 text-rose-200";
            return (
              <button
                key={p}
                type="button"
                onClick={() => setPlan(p)}
                className={`rounded-md border px-3 py-2 text-xs font-semibold transition ${
                  active
                    ? color
                    : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
                }`}
              >
                {p === "VIP_PLUS" ? "VIP+" : p === "VIP" ? "VIP" : "Premium"}
              </button>
            );
          })}
        </div>
        <input type="hidden" name="plan" value={plan} />
      </div>

      {/* Duration */}
      <div className="space-y-2">
        <label className="text-[11px] font-bold tracking-[0.10em] uppercase text-white/45">
          Duration
        </label>
        <div className="flex flex-wrap gap-2">
          {DURATION_PRESETS.map((d) => {
            const active = durationDays === d;
            return (
              <button
                key={d}
                type="button"
                onClick={() => setDurationDays(d)}
                className={`rounded-md border px-3 py-1.5 text-xs font-semibold transition ${
                  active
                    ? "border-emerald-500/60 bg-emerald-500/15 text-emerald-200"
                    : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
                }`}
              >
                {d} days
              </button>
            );
          })}
          <input
            type="number"
            min={1}
            max={365}
            value={durationDays}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (Number.isFinite(n)) setDurationDays(n);
            }}
            className="w-24 rounded-md bg-black/40 border border-white/10 px-2 py-1.5 text-xs text-white tabular-nums focus:outline-none focus:border-purple-500/40"
          />
        </div>
        <input
          type="hidden"
          name="durationDays"
          value={durationDays.toString()}
        />
        <p className="text-[11px] text-white/45">
          Starts now · ends{" "}
          <strong className="text-white/75">
            {endsPreview.toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </strong>
        </p>
      </div>

      {/* Verified attestation */}
      <label className="flex items-start gap-2.5 cursor-pointer">
        <input
          type="checkbox"
          name="markVerified"
          checked={wantsVerified}
          onChange={(e) => setVerifiedAuto(e.target.checked)}
          className="mt-0.5 accent-purple-500"
        />
        <span className="text-xs text-white/65 leading-relaxed">
          <strong className="text-white/85">Mark as verified.</strong> Required
          for VIP+ in the checkout flow. By ticking this you're attesting
          you've personally vetted the creator's identity.
        </span>
      </label>

      <button
        type="submit"
        disabled={pending || !creatorId}
        className="w-full rounded-md bg-emerald-600 hover:bg-emerald-500 px-3 py-2.5 text-sm font-semibold text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {pending ? "Granting…" : "Grant founding tier"}
      </button>

      {feedback && (
        <p
          className={`text-xs leading-relaxed rounded-md px-3 py-2 ${
            feedback.kind === "ok"
              ? "bg-emerald-500/10 text-emerald-200 border border-emerald-500/30"
              : "bg-rose-500/10 text-rose-200 border border-rose-500/30"
          }`}
        >
          {feedback.text}
        </p>
      )}
    </form>
  );
}
