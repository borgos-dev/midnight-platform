// Single source of truth for boost pricing. UI, server action validation,
// and admin display all import from here so prices and durations can't
// drift across screens.

export type BoostPlan = {
  durationDays: number;
  amountCfa: number;
  label: string;
  popular?: boolean;
};

export const BOOST_PLANS: BoostPlan[] = [
  { durationDays: 3, amountCfa: 1000, label: "3 days" },
  { durationDays: 7, amountCfa: 2000, label: "7 days", popular: true },
  { durationDays: 14, amountCfa: 3500, label: "14 days" },
];

/** Returns the plan matching `durationDays`, or null if it's not a known
 *  plan. Server actions use this so a tampered form can't request a
 *  custom duration that wasn't offered. */
export function findBoostPlan(durationDays: number): BoostPlan | null {
  return (
    BOOST_PLANS.find((p) => p.durationDays === durationDays) ?? null
  );
}

export function formatCfa(amount: number): string {
  return `${amount.toLocaleString("en-US")} CFA`;
}
